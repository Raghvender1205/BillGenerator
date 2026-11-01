import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { dragInvoiceItem } from './drag'

test('compact charges keep quantities, totals, overrides and reordering together', async ({
  page,
  account,
  isMobile,
}) => {
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 })
  const headers = {
    Origin: 'http://127.0.0.1:3100',
    'X-RentFlow-User': account.id,
  }
  for (const charge of [
    {
      name: 'Electricity',
      mode: 'per_unit',
      unit: 'kWh',
      rate: '8',
      enabled: true,
    },
    {
      name: 'Maintenance',
      mode: 'fixed',
      unit: 'charge',
      rate: '500',
      enabled: true,
    },
  ]) {
    expect(
      (
        await page.request.post('/api/charge-rates', { headers, data: charge })
      ).status(),
    ).toBe(200)
  }
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await page
    .getByLabel('Amount for Monthly rent', { exact: true })
    .fill('10000')
  await page
    .getByRole('button', { name: 'Add Electricity', exact: true })
    .click()
  await page.getByLabel('Quantity for Electricity', { exact: true }).fill('120')
  await page
    .getByRole('button', { name: 'Add Maintenance', exact: true })
    .click()
  const power = page
    .locator('.line-items')
    .getByRole('region', { name: 'Electricity charge details', exact: true })
  const maintenance = page
    .locator('.line-items')
    .getByRole('region', { name: 'Maintenance charge details', exact: true })
  await expect(
    power.getByRole('heading', { name: 'Electricity', exact: true }),
  ).toHaveCount(1)
  await expect(
    page.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('960.00')
  await expect(page.locator('.editor-total strong')).toHaveText('₹11,460.00')
  await expect(page.locator('.charge-calculation')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Add Water', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.line-row[data-dragging="true"]')).toHaveCount(0)
  await page
    .locator('#charges')
    .screenshot({ path: test.info().outputPath('compact-charges-light.png') })
  expect(
    (await new AxeBuilder({ page }).include('#charges').analyze()).violations,
  ).toEqual([])
  await page
    .locator('html')
    .evaluate((element) => element.classList.add('dark'))
  await page
    .locator('#charges')
    .screenshot({ path: test.info().outputPath('compact-charges-dark.png') })
  expect(
    (await new AxeBuilder({ page }).include('#charges').analyze()).violations,
  ).toEqual([])
  await page
    .locator('html')
    .evaluate((element) => element.classList.remove('dark'))
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)

  await dragInvoiceItem(page, 'Electricity', 'Monthly rent', isMobile)
  await expect(
    power.getByLabel('Quantity for Electricity', { exact: true }),
  ).toHaveValue('120')
  const grip = page.getByRole('button', {
    name: 'Reorder Electricity',
    exact: true,
  })
  await expect(grip).toHaveAttribute('aria-pressed', 'false')
  await grip.focus()
  await page.keyboard.press('Space')
  await expect(grip).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(
    page.locator('.line-items .drag-handle').first(),
  ).toHaveAttribute('aria-label', 'Reorder Monthly rent')
  await page.keyboard.press('Space')
  await expect(grip).toHaveAttribute('aria-pressed', 'false')

  await power.getByRole('button', { name: 'Change rate', exact: true }).click()
  await power
    .getByLabel('Rate override for Electricity', { exact: true })
    .fill('9')
  await expect(
    power.getByLabel('Amount for Electricity', { exact: true }),
  ).toHaveValue('1080.00')
  await maintenance
    .getByRole('button', { name: 'Change amount', exact: true })
    .click()
  await maintenance
    .getByLabel('Amount for Maintenance', { exact: true })
    .fill('600')
  await expect(page.locator('.editor-total strong')).toHaveText('₹11,680.00')
  const saved = await (
    await page.request.get('/api/charge-rates', { headers })
  ).json()
  expect(
    saved.find((charge: { name: string }) => charge.name === 'Electricity')
      .rate,
  ).toBe('8')
  expect(
    saved.find((charge: { name: string }) => charge.name === 'Maintenance')
      .rate,
  ).toBe('500')
  await power
    .getByRole('button', { name: 'Restore saved rate', exact: true })
    .click()
  await maintenance
    .getByRole('button', { name: 'Restore saved amount', exact: true })
    .click()
  await expect(page.locator('.editor-total strong')).toHaveText('₹11,460.00')
  await expect(
    page.getByLabel('Rate override for Electricity', { exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Remove Electricity', exact: true })
    .click()
  await expect(power).toHaveCount(0)
  await expect(page.locator('.editor-total strong')).toHaveText('₹10,500.00')
})
