import { test as base, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const testUrl = process.env.SUPABASE_TEST_URL
if (
  !testUrl ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(testUrl).hostname)
)
  throw new Error(
    'Account tests require local Supabase. Run npm run test:local; hosted targets are refused.',
  )
export const admin = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_ADMIN_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
export const test = base.extend<{
  account: { id: string; email: string; password: string }
}>({
  account: async ({}, provide) => {
    const email = `rentflow-e2e-${randomUUID()}@example.test`
    const password = `Test-${randomUUID()}!`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !data.user)
      throw new Error('Could not create a temporary integration-test account.')
    try {
      const profile = await admin
        .from('rentflow_profiles')
        .insert({ user_id: data.user.id })
      if (profile.error)
        throw new Error('Could not initialize the local test profile.')
      await provide({ id: data.user.id, email, password })
    } finally {
      const { error } = await admin.auth.admin.deleteUser(data.user.id)
      if (error)
        throw new Error(
          `Could not clean up temporary test user ${data.user.id}.`,
        )
    }
  },
  page: async ({ page, account }, provide) => {
    await page.clock.setFixedTime(new Date('2026-11-02T12:00:00+05:30'))
    await page.goto('/login')
    await page.getByLabel('Email address', { exact: true }).fill(account.email)
    await page.getByLabel('Password', { exact: true }).fill(account.password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL('/')
    await expect(page.getByLabel('Invoice number')).toBeEnabled()
    await provide(page)
  },
})
export { expect }
