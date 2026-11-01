import { test, expect, admin } from './fixtures'
import AxeBuilder from '@axe-core/playwright'

test('first sign-in saves optional people and only chosen charges reach the builder', async ({
  page,
  account,
  isMobile,
}) => {
  await admin.from('rentflow_profiles').delete().eq('user_id', account.id)
  await page.goto('/')
  await expect(page).toHaveURL('/onboarding')
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 })
  await page.getByPlaceholder('e.g. Alex Morgan').fill('Onboarding Landlord')
  await page.getByPlaceholder('e.g. +91 98765 43210').fill('9876543210')
  await page.getByRole('button', { name: 'Continue to tenant' }).click()
  await expect(
    page.getByRole('heading', { name: 'Who will you bill?' }),
  ).toBeVisible()
  await page.getByPlaceholder('e.g. Jamie Parker').fill('Onboarding Tenant')
  await page
    .getByPlaceholder('How to reach your tenant')
    .fill('tenant@example.test')
  await page
    .getByPlaceholder('Flat / house number, street, city, postal code')
    .fill('Flat 7, Tenant Street')
  await page.screenshot({
    path: test.info().outputPath('tenant-step-light.png'),
    fullPage: true,
  })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page
    .locator('html')
    .evaluate((element) => element.classList.add('dark'))
  await page.screenshot({
    path: test.info().outputPath('tenant-step-dark.png'),
    fullPage: true,
  })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page
    .locator('html')
    .evaluate((element) => element.classList.remove('dark'))
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Onboarding Landlord',
  )
  await page.getByRole('button', { name: 'Continue to tenant' }).click()
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Onboarding Tenant',
  )
  await page.getByRole('button', { name: 'Continue to charges' }).click()
  await page
    .getByRole('checkbox', { name: 'Include Electricity', exact: true })
    .check()
  await page.getByLabel('Electricity unit rate', { exact: true }).fill('8.5')
  await page
    .getByRole('checkbox', { name: 'Include Parking', exact: true })
    .check()
  await page.getByLabel('Parking default amount', { exact: true }).fill('300')
  await page.screenshot({
    path: test.info().outputPath('onboarding-light.png'),
    fullPage: true,
  })
  await page
    .locator('html')
    .evaluate((element) => element.classList.add('dark'))
  await page.screenshot({
    path: test.info().outputPath('onboarding-dark.png'),
    fullPage: true,
  })
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])
  let failOnce = true
  await page.route('**/api/onboarding', async (route) => {
    if (failOnce) {
      failOnce = false
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Setup temporarily unavailable. Please retry.',
        }),
      })
    } else await route.continue()
  })
  await page
    .getByRole('button', { name: 'Start creating bills', exact: true })
    .click()
  await expect(page.locator('.onboarding-shell').getByRole('alert')).toHaveText(
    'Setup temporarily unavailable. Please retry.',
  )
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Onboarding Tenant',
  )
  await page.getByRole('button', { name: 'Continue to charges' }).click()
  let tenantRequests = 0
  await page.route('**/api/tenants', async (route) => {
    if (route.request().method() === 'GET') tenantRequests++
    await route.continue()
  })
  await page
    .getByRole('button', { name: 'Start creating bills', exact: true })
    .click()
  await expect(page).toHaveURL('/')
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Onboarding Landlord',
  )
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Onboarding Tenant',
  )
  await expect(page.getByPlaceholder('How to reach your tenant')).toHaveValue(
    'tenant@example.test',
  )
  await expect(
    page.getByPlaceholder('Flat / house number, street, city, postal code'),
  ).toHaveValue('Flat 7, Tenant Street')
  await expect(page.locator('.saved-tenants')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  expect(tenantRequests).toBe(0)
  await expect(
    page.getByRole('button', { name: 'Add Electricity', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Add Parking', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Add Water', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Add Maintenance', exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await expect(page).toHaveURL('/')
  await page.goto('/onboarding')
  await expect(page).toHaveURL('/')
})

test('skipping onboarding persists and leaves only rent until settings are configured', async ({
  page,
  account,
}) => {
  await admin.from('rentflow_profiles').delete().eq('user_id', account.id)
  await page.goto('/')
  await expect(page).toHaveURL('/onboarding')
  await page.getByRole('button', { name: 'Skip for now', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByLabel('Amount for Monthly rent', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.charge-shortcut')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Add a charge', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByText('Electricity', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page).toHaveURL('/')
  await page
    .getByRole('link', { name: 'Profile settings', exact: true })
    .click()
  await page
    .getByRole('checkbox', { name: 'Include Water', exact: true })
    .check()
  await page.getByLabel('Billing method for Water').selectOption('fixed')
  await page.getByLabel('Water default amount').fill('200')
  await page.getByRole('button', { name: 'Save my charges' }).click()
  await expect(page.locator('.settings-status')).toHaveText(
    'Your charges have been saved.',
  )
  await page.getByRole('link', { name: 'Back to invoice builder' }).click()
  await page.getByRole('button', { name: 'Add Water', exact: true }).click()
  await expect(
    page.getByLabel('Amount for Water', { exact: true }),
  ).toHaveValue('200.00')
})

test('tenant step can be skipped independently with partially entered details', async ({
  page,
  account,
}) => {
  await admin.from('rentflow_profiles').delete().eq('user_id', account.id)
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'Continue to tenant' }).click()
  await page
    .getByPlaceholder('How to reach your tenant')
    .fill('Unsaved contact')
  await page.getByRole('button', { name: 'Continue to charges' }).click()
  await expect(
    page.getByRole('heading', { name: 'Who will you bill?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Skip tenant', exact: true }).click()
  await page
    .getByRole('button', { name: 'Start creating bills', exact: true })
    .click()
  await expect(page).toHaveURL('/')
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue('')
  await expect(page.getByPlaceholder('How to reach your tenant')).toHaveValue(
    '',
  )
  const tenants = await page.request.get('/api/tenants', {
    headers: { 'X-RentFlow-User': account.id },
  })
  expect(await tenants.json()).toEqual([])
  await page.goto('/onboarding')
  await expect(page).toHaveURL('/')
})

test('onboarding validates tenant details before saving any setup', async ({
  page,
  account,
}) => {
  await admin.from('rentflow_profiles').delete().eq('user_id', account.id)
  const headers = {
    Origin: 'http://127.0.0.1:3100',
    'X-RentFlow-User': account.id,
  }
  for (const tenant of [
    { name: '', contact: 'Contact only', address: '' },
    { name: 'Tenant', contact: '', address: 'x'.repeat(301) },
    { name: 'Tenant', contact: 'x'.repeat(151), address: '' },
  ]) {
    expect(
      (
        await page.request.post('/api/onboarding', {
          headers,
          data: {
            skip: false,
            landlord: { name: 'Should not be saved', phone: '' },
            tenant,
            charges: [],
          },
        })
      ).status(),
    ).toBe(400)
  }
  const { data: profile } = await admin
    .from('rentflow_profiles')
    .select('user_id')
    .eq('user_id', account.id)
    .maybeSingle()
  expect(profile).toBeNull()
  for (const table of ['rentflow_landlords', 'rentflow_tenants'] as const) {
    const { data } = await admin
      .from(table)
      .select('id')
      .eq('user_id', account.id)
    expect(data).toEqual([])
  }
})
