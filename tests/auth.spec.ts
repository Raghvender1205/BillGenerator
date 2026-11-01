import { test, expect } from '@playwright/test'
import { test as accountTest, admin } from './fixtures'
import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'

test('sign-in is optional and private APIs require a session', async ({
  page,
  request,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL('/')
  await expect(page.getByLabel('Invoice number')).toBeEnabled()
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL('/auth/sign-up')
  await expect(
    page.getByRole('heading', { name: 'Create your account' }),
  ).toBeVisible()
  await page
    .getByLabel('Email address', { exact: true })
    .fill('test@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Password-test-123!')
  await page.getByLabel('Confirm password').fill('Does-not-match-123!')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.locator('.auth-card [role=alert]')).toContainText(
    'passwords do not match',
  )
  await page.goto('/auth/forgot-password')
  await expect(
    page.getByRole('button', { name: 'Send reset link' }),
  ).toBeVisible()
  await page.goto('/auth/update-password')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/auth/callback?next=https://example.com')
  await expect(page).toHaveURL(/\/login\?error=link$/)
  await expect(page.locator('.auth-card [role=alert]')).toContainText(
    'invalid or has expired',
  )
  expect((await request.get('/api/invoice')).status()).toBe(401)
  expect(
    (
      await request.put('/api/invoice', {
        headers: { Origin: 'https://example.com' },
        data: {},
      })
    ).status(),
  ).toBe(403)
})

test('unconfirmed users verify their email before signing in', async ({
  page,
}) => {
  const email = `rentflow-e2e-${randomUUID()}@example.test`
  const password = `Test-${randomUUID()}!`
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
  })
  if (error || !data.user)
    throw new Error('Could not generate a test email confirmation.')
  try {
    await page.goto('/login')
    await page.getByLabel('Email address', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.locator('.auth-card [role=alert]')).toContainText(
      'Confirm your email',
    )
    await page.goto(
      `/auth/confirm?type=email&token_hash=${encodeURIComponent(data.properties.hashed_token)}`,
    )
    await expect(page).toHaveURL('/')
    await expect(page.getByLabel('Invoice number')).toBeEnabled()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByLabel('Invoice number')).toBeEnabled()
    await expect(
      page.getByRole('button', { name: 'Sign out', exact: true }),
    ).toHaveCount(0)
  } finally {
    await admin.auth.admin.deleteUser(data.user.id)
  }
})

accountTest(
  'a recovery link allows a password change and sign-in with the new password',
  async ({ page, account }) => {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: account.email,
    })
    if (error) throw new Error('Could not generate a test recovery link.')
    await page.goto(
      `/auth/confirm?type=recovery&token_hash=${encodeURIComponent(data.properties.hashed_token)}`,
    )
    await expect(page).toHaveURL(/\/auth\/update-password$/)
    const password = `Updated-${randomUUID()}!`
    await page.getByLabel('New password', { exact: true }).fill(password)
    await page.getByLabel('Confirm password').fill(password)
    await page.getByRole('button', { name: 'Save new password' }).click()
    await expect(page).toHaveURL('/')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await page.goto('/login')
    await page.getByLabel('Email address', { exact: true }).fill(account.email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL('/')
  },
)

accountTest(
  'draft saves reject stale revisions and account switches',
  async ({ page, account }) => {
    await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
      'All changes saved to your account',
    )
    const read = await page.request.get('/api/invoice', {
      headers: { 'X-RentFlow-User': account.id },
    })
    const draft = await read.json()
    const headers = {
      Origin: 'http://127.0.0.1:3100',
      'X-RentFlow-User': account.id,
    }
    const updated = {
      ...draft.invoice,
      landlord: { ...draft.invoice.landlord, name: 'Updated elsewhere' },
    }
    const write = await page.request.put('/api/invoice', {
      headers,
      data: { invoice: updated, revision: draft.revision },
    })
    expect(write.status()).toBe(200)
    const stale = await page.request.put('/api/invoice', {
      headers,
      data: { invoice: draft.invoice, revision: draft.revision },
    })
    expect(stale.status()).toBe(409)
    const switched = await page.request.put('/api/invoice', {
      headers: { ...headers, 'X-RentFlow-User': randomUUID() },
      data: { invoice: draft.invoice, revision: draft.revision + 1 },
    })
    expect(switched.status()).toBe(409)
    const saved = await admin
      .from('rentflow_drafts')
      .select('invoice')
      .eq('user_id', account.id)
      .single()
    expect(saved.data?.invoice.landlord.name).toBe('Updated elsewhere')
  },
)
