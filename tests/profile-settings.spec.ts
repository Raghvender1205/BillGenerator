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

test('settings offer only selected charges, with quantity entry and bill-only overrides', async ({
  page,
  isMobile,
}) => {
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 })
  await page
    .getByRole('link', { name: 'Profile settings', exact: true })
    .click()
  await page
    .getByLabel('Landlord name', { exact: true })
    .fill('Settings Landlord')
  await page.getByLabel('Landlord phone', { exact: true }).fill('9876543210')
  await page.getByRole('button', { name: 'Save landlord', exact: true }).click()
  await expect(page.locator('.saved-landlord-status')).toHaveText(
    'Landlord saved to your account.',
  )
  await page
    .getByRole('checkbox', { name: 'Include Electricity', exact: true })
    .check()
  await page.getByLabel('Electricity unit rate', { exact: true }).fill('8.5')
  await page
    .getByRole('checkbox', { name: 'Include Maintenance', exact: true })
    .check()
  await page
    .getByLabel('Maintenance default amount', { exact: true })
    .fill('500')
  await page
    .getByRole('button', { name: 'Save my charges', exact: true })
    .click()
  await expect(page.locator('.settings-status')).toHaveText(
    'Your charges have been saved.',
  )
  await page.screenshot({
    path: test.info().outputPath('settings-choices.png'),
    fullPage: true,
  })
  await page
    .getByRole('link', { name: 'Back to invoice builder', exact: true })
    .click()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Settings Landlord',
  )
  await expect(
    page.getByRole('button', { name: 'Add a charge', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('option', { name: 'Water', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByText('Water', { exact: true })).toHaveCount(0)
  await page.getByPlaceholder('e.g. Jamie Parker').fill('Utility Tenant')
  await page
    .getByPlaceholder('Flat / house number, street, city, postal code')
    .fill('Test property')
  await page.getByLabel('Amount for Monthly rent', { exact: true }).fill('1000')
  await page
    .getByLabel('Add one of your charges')
    .selectOption({ label: 'Electricity' })
  await page.getByLabel('Quantity for Electricity', { exact: true }).fill('120')
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1020.00')
  await expect(
    page.getByLabel('Rate override for Electricity', { exact: true }),
  ).toHaveCount(0)
  const power = page.getByRole('region', {
    name: 'Electricity charge details',
    exact: true,
  })
  await power
    .getByRole('button', { name: 'Override for this bill', exact: true })
    .click()
  await page
    .getByLabel('Rate override for Electricity', { exact: true })
    .fill('9')
  await page
    .getByLabel('Add one of your charges')
    .selectOption({ label: 'Maintenance' })
  await expect(
    page.getByLabel('Amount for Maintenance', { exact: true }),
  ).toHaveValue('500.00')
  const maintenance = page.getByRole('region', {
    name: 'Maintenance charge details',
    exact: true,
  })
  await maintenance
    .getByRole('button', { name: 'Override for this bill', exact: true })
    .click()
  await page
    .getByLabel('Amount override for Maintenance', { exact: true })
    .fill('600')
  await expect(page.locator('.editor-total strong')).toHaveText('₹2,680.00')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.reload()
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1080.00')
  await expect(
    page.getByLabel('Amount for Maintenance', { exact: true }),
  ).toHaveValue('600')
  const downloaded = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download invoice', exact: true })
    .click()
  const pdf = (await readFile((await (await downloaded).path())!)).toString()
  expect(pdf).toContain('120 kWh x Rs. 9 / kWh')
  await expect(
    page.getByRole('button', { name: 'Download invoice', exact: true }),
  ).toBeEnabled()
  await page.goto('/settings')
  await expect(
    page.getByLabel('Electricity unit rate', { exact: true }),
  ).toHaveValue('8.5')
  await expect(
    page.getByLabel('Maintenance default amount', { exact: true }),
  ).toHaveValue('500')
  await page.getByLabel('Electricity unit rate', { exact: true }).fill('7')
  await page
    .getByRole('checkbox', { name: 'Include Maintenance', exact: true })
    .uncheck()
  await page
    .getByRole('button', { name: 'Save my charges', exact: true })
    .click()
  await expect(page.locator('.settings-status')).toHaveText(
    'Your charges have been saved.',
  )
  await page
    .getByRole('link', { name: 'Back to invoice builder', exact: true })
    .click()
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1080.00')
  await expect(
    page.getByLabel('Amount for Maintenance', { exact: true }),
  ).toHaveValue('600')
  await expect(
    page.getByRole('option', { name: 'Maintenance', exact: true }),
  ).toHaveCount(0)
  await page
    .getByLabel('Add one of your charges')
    .selectOption({ label: 'Electricity' })
  await page
    .getByLabel('Quantity for Electricity', { exact: true })
    .last()
    .fill('2')
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }).last(),
  ).toHaveValue('14.00')
  await page
    .locator('#charges')
    .screenshot({ path: test.info().outputPath('bill-quantity-only.png') })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
