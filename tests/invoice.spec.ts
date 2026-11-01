import { type Page } from '@playwright/test'
import { test, expect, admin } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

async function fillInvoice(page: Page) {
  await page.goto('/')
  await page.getByPlaceholder('e.g. Alex Morgan').fill('Alex Morgan')
  await page.getByPlaceholder('e.g. Jamie Parker').fill('Jamie Parker')
  await page
    .getByPlaceholder('Flat / house number, street, city, postal code')
    .fill('12 Garden Road, Bengaluru 560001')
  await page
    .getByRole('spinbutton', { name: 'Amount for Monthly rent' })
    .fill('18000.10')
}

test('allows guests to open the invoice builder', async ({ request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBeTruthy()
  expect(new URL(response.url()).pathname).toBe('/')
  expect(await response.text()).toContain('Invoice number')
})

test('updates totals, restores the full draft, and downloads a PDF', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await fillInvoice(page)
  await page.getByRole('button', { name: 'Add a charge', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Charge 2 description' })
    .fill('Water charges')
  await page
    .getByRole('spinbutton', { name: 'Amount for Water charges' })
    .fill('450.20')
  await page.getByRole('button', { name: 'Add discount', exact: true }).click()
  await page
    .getByRole('spinbutton', { name: 'Amount for Discount' })
    .fill('500.10')
  await expect(page.locator('.editor-total strong')).toHaveText('₹17,950.20')
  await expect(page.locator('.paper-total strong').first()).toHaveText(
    '₹17,950.20',
  )
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  const number = await page.getByLabel('Invoice number').inputValue()
  await page.reload()
  await expect(page.getByLabel('Invoice number')).toHaveValue(number)
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Jamie Parker',
  )
  await expect(page.locator('.editor-total strong')).toHaveText('₹17,950.20')
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(`invoice-${number}.pdf`)
  const path = await download.path()
  const pdf = await readFile(path!)
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect(pdf.toString()).toContain('17,950.20')
  expect(errors).toEqual([])
  await page.screenshot({
    path: `test-results/invoice-${test.info().project.name}.png`,
    fullPage: true,
  })
})

test('validates discounts, removes items, and resets with party details kept', async ({
  page,
}) => {
  await fillInvoice(page)
  await page.getByRole('button', { name: 'Add discount', exact: true }).click()
  await page
    .getByRole('spinbutton', { name: 'Amount for Discount' })
    .fill('19000')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  await expect(page.locator('.form-error')).toContainText(
    'Discounts cannot exceed',
  )
  await page
    .getByRole('button', { name: 'Remove Discount', exact: true })
    .click()
  await expect(page.locator('.editor-total strong')).toHaveText('₹18,000.10')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Alex Morgan',
  )
  await expect(
    page.getByRole('spinbutton', { name: 'Amount for Monthly rent' }),
  ).toHaveValue('')
  await expect(page.locator('.editor-total strong')).toHaveText('₹0.00')
})

test('preview supports keyboard dismissal and themes have no accessibility violations', async ({
  page,
}) => {
  await fillInvoice(page)
  await page.getByRole('button', { name: 'Expand' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Toggle color theme' }).click()
    await expect(page.locator('html')).toHaveClass(theme)
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(result.violations).toEqual([])
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    await page.screenshot({
      path: `test-results/${theme}-${test.info().project.name}.png`,
      fullPage: true,
    })
  }
})

test('browser storage corruption does not affect cloud drafts', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('rentflow_draft_v1', '{broken json'),
  )
  await fillInvoice(page)
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable')
    }
    Storage.prototype.getItem = () => {
      throw new Error('Storage unavailable')
    }
  })
  await page.reload()
  await page.getByPlaceholder('e.g. Alex Morgan').fill('Still works')
  await expect(page.locator('.editor-bottom [role="status"]')).toContainText(
    'All changes saved to your account',
  )
})

test('form fields stay inside the editor at phone, tablet, and desktop widths', async ({
  page,
}) => {
  await page.goto('/')
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const clipped = await page
      .locator('.editor-column input, .editor-column textarea')
      .evaluateAll(
        (fields) =>
          fields.filter((field) => {
            const box = field.getBoundingClientRect()
            const section = field
              .closest('.editor-section')!
              .getBoundingClientRect()
            return box.left < section.left || box.right > section.right
          }).length,
      )
    expect(clipped, `clipped fields at ${width}px`).toBe(0)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  }
})

test('long invoices paginate, keep the last item, and omit legacy notes', async ({
  page,
  account,
}) => {
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  const { error } = await admin.from('rentflow_drafts').upsert({
    user_id: account.id,
    revision: 1,
    invoice: {
      landlord: { name: 'Alex Morgan', phone: '' },
      tenant: {
        name: 'Jamie Parker',
        address: '12 Garden Road',
        contact: '',
      },
      number: 'RF-LONG',
      issued: '2026-11-01',
      due: '2026-11-08',
      notes: 'Final payment instructions.',
      items: Array.from({ length: 65 }, (_, i) => ({
        id: `row-${i}`,
        title: `Rent charge ${i + 1}`,
        amount: '100',
        type: 'regular',
      })),
    },
  })
  expect(error).toBeNull()
  await page.goto('/')
  await expect(page.getByLabel('Invoice number')).toHaveValue('RF-LONG')
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  const download = await downloadPromise
  const content = (await readFile((await download.path())!)).toString()
  expect(content).toContain('Rent charge 65')
  expect(content).not.toContain('Final payment instructions.')
  expect((content.match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1)
})

test('new invoices default to the first of the month and allow an earlier edited date', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-02T12:00:00+05:30'))
  await fillInvoice(page)
  await expect(page.getByLabel('Due date', { exact: true })).toHaveValue(
    '2026-11-01',
  )
  await expect(page.getByLabel('Issue date', { exact: true })).toHaveCount(0)
  await expect(page.locator('.paper-dates').first()).toHaveText(
    'DUE DATE01 Nov 2026',
  )
  await expect(page.locator('.invoice-paper').first()).not.toContainText(
    'ISSUED',
  )
  await page.getByLabel('Due date', { exact: true }).fill('2026-10-01')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.reload()
  await expect(page.getByLabel('Due date', { exact: true })).toHaveValue(
    '2026-10-01',
  )
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  const download = await downloadPromise
  const content = (await readFile((await download.path())!)).toString()
  expect(content).toContain('Due date: 01 Oct 2026')
  expect(content).not.toContain('Issued:')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(page.getByLabel('Due date', { exact: true })).toHaveValue(
    '2026-11-01',
  )
})

test('monthly invoice numbers advance only for new invoices and remain editable', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-02T12:00:00+05:30'))
  await page.goto('/')
  const number = page.getByLabel('Invoice number')
  await expect(number).toHaveValue('INV-202611-001')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.reload()
  await expect(number).toHaveValue('INV-202611-001')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(number).toHaveValue('INV-202611-002')
  await number.fill('INV-CUSTOM-42')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.reload()
  await expect(number).toHaveValue('INV-CUSTOM-42')
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(number).toHaveValue('INV-202611-003')
  await page.clock.setFixedTime(new Date('2026-12-02T12:00:00+05:30'))
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(number).toHaveValue('INV-202612-001')
  await page.clock.setFixedTime(new Date('2026-11-02T12:00:00+05:30'))
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(number).toHaveValue('INV-202611-004')
})
