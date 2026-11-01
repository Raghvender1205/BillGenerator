import { test, expect } from './fixtures'
import { readFile } from 'node:fs/promises'
import { calculatedAmount } from '../src/app/lib/charge-rates'
import { emptyInvoice, isInvoice } from '../src/app/lib/invoice'

test('calculated amounts round once to paise and validate saved snapshots', () => {
  expect(calculatedAmount('120', '8.5')).toBe('1020.00')
  expect(calculatedAmount('1', '1.005')).toBe('1.01')
  expect(calculatedAmount('.1', '.2')).toBe('0.02')
  expect(calculatedAmount('1.2345', '2.3456')).toBe('2.90')
  expect(calculatedAmount('0.0001', '0.0001')).toBe('0.00')
  for (const quantity of ['', '-1', '1e3', 'NaN', '1.00001', '1000001'])
    expect(calculatedAmount(quantity, '1')).toBe('')
  expect(calculatedAmount('1000000', '1000000')).toBe('')
  const legacy = {
    ...emptyInvoice,
    due: '2026-11-01',
    items: [{ id: 'rent', type: 'regular', title: 'Rent', amount: '10' }],
  }
  expect(isInvoice(legacy)).toBe(true)
  const calculated = {
    ...legacy,
    items: [
      {
        id: 'power',
        type: 'regular',
        title: 'Electricity',
        quantity: '120',
        rate: '8.5',
        unit: 'kWh',
        amount: '1020.00',
      },
    ],
  }
  expect(isInvoice(calculated)).toBe(true)
  expect(
    isInvoice({
      ...calculated,
      items: [{ ...calculated.items[0], amount: '1' }],
    }),
  ).toBe(false)
})

test('charge-rate API rejects invalid precision, wrong origins, and wrong accounts', async ({
  page,
  account,
}) => {
  const headers = {
    Origin: 'http://127.0.0.1:3100',
    'X-RentFlow-User': account.id,
  }
  for (const rate of ['-1', '1.00001', '1000001', '1e3', 'NaN']) {
    expect(
      (
        await page.request.post('/api/charge-rates', {
          headers,
          data: { name: 'Invalid', unit: 'units', rate },
        })
      ).status(),
    ).toBe(400)
  }
  const data = { name: 'Water', unit: 'litres', rate: '0.025' }
  expect(
    (
      await page.request.post('/api/charge-rates', {
        headers: { ...headers, Origin: 'https://example.test' },
        data,
      })
    ).status(),
  ).toBe(403)
  expect(
    (
      await page.request.post('/api/charge-rates', {
        headers: { ...headers, 'X-RentFlow-User': 'another-account' },
        data,
      })
    ).status(),
  ).toBe(409)
  expect(
    (await page.request.post('/api/charge-rates', { headers, data })).status(),
  ).toBe(200)
  expect(
    (await page.request.post('/api/charge-rates', { headers, data })).status(),
  ).toBe(409)
  const list = await page.request.get('/api/charge-rates', { headers })
  expect(list.headers()['cache-control']).toContain('private, no-store')
  const saved = (await list.json())[0]
  expect(saved.rate).toBe('0.025')
  expect(
    (
      await page.request.delete('/api/charge-rates', {
        headers,
        data: { id: saved.id },
      })
    ).status(),
  ).toBe(200)
  expect(
    (
      await page.request.patch('/api/charge-rates', {
        headers,
        data: { ...data, id: saved.id },
      })
    ).status(),
  ).toBe(404)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  expect(
    (await page.request.get('/api/charge-rates', { headers })).status(),
  ).toBe(401)
})

test('profile landlords and saved rates prefill bills while historical calculations keep their rate', async ({
  page,
  account,
  isMobile,
}) => {
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 })
  await page
    .getByRole('link', { name: 'Profile settings', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Profile settings', exact: true }),
  ).toBeVisible()
  await page
    .getByLabel('Landlord name', { exact: true })
    .fill('Settings Landlord')
  await page.getByLabel('Landlord phone', { exact: true }).fill('9876543210')
  await page.getByRole('button', { name: 'Save landlord', exact: true }).click()
  await expect(page.locator('.saved-landlord-status')).toHaveText(
    'Landlord saved to your account.',
  )
  await page.getByLabel('Charge name', { exact: true }).fill('Electricity')
  await page.getByLabel('Unit label', { exact: true }).fill('kWh')
  await page.getByLabel('Rate per unit (INR)', { exact: true }).fill('8.5')
  await page
    .getByRole('button', { name: 'Save charge rate', exact: true })
    .click()
  await expect(page.locator('.settings-status')).toHaveText(
    'Charge rate saved.',
  )
  await page.screenshot({
    path: test.info().outputPath('profile-settings-light.png'),
    fullPage: true,
  })
  await page
    .locator('html')
    .evaluate((element) => element.classList.add('dark'))
  await page.screenshot({
    path: test.info().outputPath('profile-settings-dark.png'),
    fullPage: true,
  })
  await page
    .locator('html')
    .evaluate((element) => element.classList.remove('dark'))
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page
    .getByRole('link', { name: 'Back to invoice builder', exact: true })
    .click()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Settings Landlord',
  )
  await page.getByPlaceholder('e.g. Jamie Parker').fill('Utility Tenant')
  await page
    .getByPlaceholder('Flat / house number, street, city, postal code')
    .fill('Test property')
  await page
    .getByRole('spinbutton', { name: 'Amount for Monthly rent', exact: true })
    .fill('1000')
  await page
    .getByLabel('Add a calculated charge')
    .selectOption({ label: 'Electricity · Rs. 8.5 / kWh' })
  await page.getByLabel('Quantity for Electricity', { exact: true }).fill('120')
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1020.00')
  await expect(page.locator('.paper-item').last()).toContainText(
    '120 kWh x Rs. 8.5 / kWh',
  )
  await page
    .getByLabel('Rate per unit for Electricity', { exact: true })
    .fill('9')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  const headers = {
    Origin: 'http://127.0.0.1:3100',
    'X-RentFlow-User': account.id,
  }
  const draft = await (
    await page.request.get('/api/invoice', { headers })
  ).json()
  const tampered = structuredClone(draft.invoice)
  tampered.items[1].amount = '1'
  expect(
    (
      await page.request.put('/api/invoice', {
        headers,
        data: { invoice: tampered, revision: draft.revision },
      })
    ).status(),
  ).toBe(400)
  await page.reload()
  await expect(
    page.getByLabel('Quantity for Electricity', { exact: true }),
  ).toHaveValue('120')
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1080.00')
  const downloaded = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  const pdf = (await readFile((await (await downloaded).path())!)).toString()
  expect(pdf).toContain('120 kWh x Rs. 9 / kWh')
  await expect(
    page.getByRole('button', { name: 'Download invoice', exact: true }),
  ).toBeEnabled()
  const number = await page.getByLabel('Invoice number').inputValue()
  await page.goto('/history')
  await page.getByRole('button', { name: `Preview ${number}` }).click()
  await expect(page.getByRole('dialog')).toContainText('120 kWh x Rs. 9 / kWh')
  await page.keyboard.press('Escape')
  await page.goto('/settings')
  await page
    .getByRole('button', { name: 'Edit Electricity rate', exact: true })
    .click()
  await page.getByLabel('Rate per unit (INR)', { exact: true }).fill('7')
  await page
    .getByRole('button', { name: 'Update charge rate', exact: true })
    .click()
  await expect(page.locator('.settings-status')).toHaveText(
    'Charge rate saved.',
  )
  await page
    .getByRole('link', { name: 'Back to invoice builder', exact: true })
    .click()
  await expect(
    page.getByLabel('Rate per unit for Electricity', { exact: true }),
  ).toHaveValue('9')
  await page
    .getByLabel('Add a calculated charge')
    .selectOption({ label: 'Electricity · Rs. 7 / kWh' })
  await page
    .getByLabel('Quantity for Electricity', { exact: true })
    .last()
    .fill('2')
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }).last(),
  ).toHaveValue('14.00')
  await page
    .locator('#charges')
    .screenshot({ path: test.info().outputPath('calculated-charges.png') })
})
