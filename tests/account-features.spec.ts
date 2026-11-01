import { test, expect } from './fixtures'
import { readFile } from 'node:fs/promises'
import { dragInvoiceItem } from './drag'

test('account exports appear in history with the same reordered charges', async ({
  page,
  account,
  isMobile,
}) => {
  await page.getByPlaceholder('e.g. Alex Morgan').fill('Cloud Landlord')
  await page.getByPlaceholder('e.g. Jamie Parker').fill('Cloud Tenant')
  await page
    .getByPlaceholder('Flat / house number, street, city, postal code')
    .fill('Cloud property')
  await page
    .getByRole('spinbutton', { name: 'Amount for Monthly rent' })
    .fill('1000')
  await page.getByRole('button', { name: 'Add discount', exact: true }).click()
  await page
    .getByRole('spinbutton', { name: 'Amount for Discount' })
    .fill('100')
  await dragInvoiceItem(page, 'Discount', 'Monthly rent', isMobile)
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.reload()
  await expect(
    page.getByRole('textbox', { name: 'Discount 1 description' }),
  ).toHaveValue('Discount')
  const number = await page.getByLabel('Invoice number').inputValue()
  const download = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  await download
  await expect(
    page.getByRole('button', { name: 'Download invoice', exact: true }),
  ).toBeEnabled()
  await expect(page.locator('#invoice-error')).toHaveCount(0)
  await page.goto('/history')
  await expect(
    page.getByRole('heading', { name: number, exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Cloud Tenant', { exact: true })).toBeVisible()
  await expect(page.locator('.history-amount')).toHaveText('₹900.00')
  await page.getByRole('button', { name: `Preview ${number}` }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('dialog .paper-item').first()).toContainText(
    'Discount',
  )
  await page.keyboard.press('Escape')
  const savedDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: `Download ${number}` }).click()
  const pdf = (await readFile((await (await savedDownload).path())!)).toString()
  expect(pdf).toContain('Cloud Landlord')
  expect(pdf.indexOf('Discount (discount)')).toBeLessThan(
    pdf.indexOf('Monthly rent'),
  )
  // Account history never appears in the guest workspace after sign-out.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue('')
  expect(
    (
      await page.request.post('/api/history', {
        headers: {
          Origin: 'http://127.0.0.1:3100',
          'X-RentFlow-User': account.id,
        },
        data: {},
      })
    ).status(),
  ).toBe(401)
})

test('browser details can be explicitly imported and preload on the next account invoice', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'rentflow_draft_v1',
      JSON.stringify({
        landlord: { name: 'Imported Landlord', phone: '9876543210' },
        tenant: {
          name: 'Imported Tenant',
          address: 'Local property',
          contact: '',
        },
        number: 'INV-LOCAL-42',
        due: '2026-11-01',
        items: [
          {
            id: 'rent',
            title: 'Monthly rent',
            amount: '2500',
            type: 'regular',
          },
        ],
      }),
    ),
  )
  await page.reload()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue('')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Import browser draft' }).click()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Imported Landlord',
  )
  await expect(page.getByLabel('Invoice number')).toHaveValue('INV-202611-001')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.getByRole('button', { name: 'Start fresh' }).click()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Imported Landlord',
  )
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Imported Tenant',
  )
  await expect(
    page.getByRole('spinbutton', { name: 'Amount for Monthly rent' }),
  ).toHaveValue('')
})
