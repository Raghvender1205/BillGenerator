import { test, expect, admin } from './fixtures'
import AxeBuilder from '@axe-core/playwright'

test('first sign-in offers optional landlord setup and only chosen charges reach the builder', async ({
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
  await page
    .getByRole('button', { name: 'Start creating bills', exact: true })
    .click()
  await expect(page).toHaveURL('/')
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Onboarding Landlord',
  )
  await expect(
    page.getByRole('option', { name: 'Electricity', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('option', { name: 'Parking', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByRole('option', { name: 'Water', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('option', { name: 'Maintenance', exact: true }),
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
  await expect(
    page.getByRole('combobox', { name: 'Add one of your charges' }),
  ).toHaveCount(0)
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
  await page
    .getByLabel('Add one of your charges')
    .selectOption({ label: 'Water' })
  await expect(
    page.getByLabel('Amount for Water', { exact: true }),
  ).toHaveValue('200.00')
})
