import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { dragInvoiceItem } from './drag'

async function fillGuest(page: Page) {
  await page.clock.setFixedTime(new Date('2026-11-02T12:00:00+05:30'))
  await page.goto('/')
  await page.getByPlaceholder('e.g. Alex Morgan').fill('Local Landlord')
  await page.getByPlaceholder('e.g. Jamie Parker').fill('Local Tenant')
  await page
    .getByPlaceholder('Flat / house number, street, city, postal code')
    .fill('12 Garden Road')
  await page
    .getByRole('spinbutton', { name: 'Amount for Monthly rent' })
    .fill('18000')
}

test('unit-based guest charges persist and reorder alongside fixed charges and discounts', async ({
  page,
  isMobile,
}) => {
  const apiCalls: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/'))
      apiCalls.push(request.url())
  })
  await fillGuest(page)
  await page.getByRole('button', { name: 'Add a charge', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Charge 2 description', exact: true })
    .fill('Electricity')
  await page
    .getByRole('button', {
      name: 'Calculate Electricity by units',
      exact: true,
    })
    .click()
  await page.getByLabel('Quantity for Electricity', { exact: true }).fill('120')
  await page
    .getByLabel('Rate per unit for Electricity', { exact: true })
    .fill('8.5')
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1020.00')
  await page.getByRole('button', { name: 'Add discount', exact: true }).click()
  await page.getByLabel('Amount for Discount', { exact: true }).fill('100')
  await dragInvoiceItem(page, 'Discount', 'Monthly rent', isMobile)
  await dragInvoiceItem(page, 'Electricity', 'Discount', isMobile)
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'Draft saved in this browser',
  )
  await page.reload()
  await expect(
    page.getByLabel('Quantity for Electricity', { exact: true }),
  ).toHaveValue('120')
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1020.00')
  await page
    .getByRole('button', {
      name: 'Use fixed amount for Electricity',
      exact: true,
    })
    .click()
  await expect(
    page.getByLabel('Quantity for Electricity', { exact: true }),
  ).toHaveCount(0)
  await page.getByLabel('Amount for Electricity', { exact: true }).fill('1030')
  await expect(page.locator('.editor-total strong')).toHaveText('₹18,930.00')
  expect(apiCalls).toEqual([])
})

test('guests generate PDFs, restore details, and keep parties for the next bill without an API', async ({
  page,
}) => {
  const apiRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/'))
      apiRequests.push(request.url())
  })
  await fillGuest(page)
  await expect(page).toHaveURL('/')
  await expect(page.getByLabel('Due date')).toHaveValue('2026-11-01')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'Draft saved in this browser',
  )
  const number = await page.getByLabel('Invoice number').inputValue()
  await page.reload()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Local Landlord',
  )
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Local Tenant',
  )
  await expect(page.getByLabel('Invoice number')).toHaveValue(number)
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  const download = await downloadPromise
  expect(
    (await readFile((await download.path())!)).subarray(0, 5).toString(),
  ).toBe('%PDF-')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(page.getByLabel('Invoice number')).toHaveValue('INV-202611-002')
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Local Landlord',
  )
  await expect(
    page.getByRole('spinbutton', { name: 'Amount for Monthly rent' }),
  ).toHaveValue('')
  expect(apiRequests).toEqual([])
})

test('old landlord and tenant details preload from local browser data', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'rentflow_landlord_info',
      JSON.stringify({ name: 'Saved Landlord', phone: '9876543210' }),
    )
    localStorage.setItem(
      'rentflow_tenant_info',
      JSON.stringify({
        name: 'Saved Tenant',
        address: 'Saved property',
        contact: 'tenant@example.test',
      }),
    )
  })
  await page.goto('/')
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Saved Landlord',
  )
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Saved Tenant',
  )
  await expect(
    page.getByPlaceholder('Flat / house number, street, city, postal code'),
  ).toHaveValue('Saved property')
})

test('charges and discounts can be reordered with a keyboard and keep their PDF order', async ({
  page,
}) => {
  await fillGuest(page)
  await page.getByRole('button', { name: 'Add a charge', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Charge 2 description' })
    .fill('Water charges')
  await page
    .getByRole('spinbutton', { name: 'Amount for Water charges' })
    .fill('450')
  await page.getByRole('button', { name: 'Add discount', exact: true }).click()
  await page
    .getByRole('spinbutton', { name: 'Amount for Discount' })
    .fill('500')
  const handle = page.getByRole('button', {
    name: 'Reorder Discount',
    exact: true,
  })
  await handle.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowUp')
  await expect
    .poll(() =>
      page.locator('.line-items .description-input input').nth(1).inputValue(),
    )
    .toBe('Discount')
  await page.keyboard.press('ArrowUp')
  await expect
    .poll(() =>
      page.locator('.line-items .description-input input').first().inputValue(),
    )
    .toBe('Discount')
  await page.keyboard.press('Space')
  await expect(
    page.getByRole('textbox', { name: 'Discount 1 description' }),
  ).toHaveValue('Discount')
  // Canceling a second drag restores its previous position.
  await handle.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(
    page.locator('.line-items .description-input input').first(),
  ).toHaveValue('Discount')
  await expect(page.locator('.editor-total strong')).toHaveText('₹17,950.00')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'Draft saved in this browser',
  )
  await page.reload()
  await expect(
    page.getByRole('textbox', { name: 'Discount 1 description' }),
  ).toHaveValue('Discount')
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  const content = (
    await readFile((await (await downloadPromise).path())!)
  ).toString()
  expect(content.indexOf('Discount (discount)')).toBeLessThan(
    content.indexOf('Monthly rent'),
  )
  await page.screenshot({
    path: `test-results/guest-reordering-${test.info().project.name}.png`,
    fullPage: true,
  })
})

test('blocked storage does not stop guest invoice generation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage blocked')
    }
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked')
    }
  })
  await fillGuest(page)
  await expect(page.locator('.editor-bottom [role="status"]')).toContainText(
    'Browser storage is unavailable',
  )
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  expect((await downloadPromise).suggestedFilename()).toMatch(/^invoice-INV-/)
})

test('guest history is an optional upgrade and guest editor remains accessible', async ({
  page,
}) => {
  await page.goto('/history')
  await expect(page).toHaveURL('/history')
  await expect(
    page.getByRole('heading', { name: 'Invoice history' }),
  ).toBeVisible()
  await page
    .getByRole('link', { name: 'Continue generating bills without an account' })
    .click()
  await expect(page.getByLabel('Invoice number')).toBeEnabled()
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(result.violations).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('charges can be dragged with a mouse or touch without moving their amounts', async ({
  page,
  isMobile,
}) => {
  await fillGuest(page)
  await page.getByRole('button', { name: 'Add a charge', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Charge 2 description' })
    .fill('Water charges')
  await page
    .getByRole('spinbutton', { name: 'Amount for Water charges' })
    .fill('450')
  await dragInvoiceItem(page, 'Water charges', 'Monthly rent', isMobile)
  await expect(
    page.getByRole('spinbutton', { name: 'Amount for Water charges' }),
  ).toHaveValue('450')
  await expect(
    page.getByRole('spinbutton', { name: 'Amount for Monthly rent' }),
  ).toHaveValue('18000')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'Draft saved in this browser',
  )
  await page.reload()
  await expect(
    page.getByRole('textbox', { name: 'Charge 1 description' }),
  ).toHaveValue('Water charges')
})
