import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

test('saved tenants prefill contact and address, cache selections, and preserve bill edits', async ({
  page,
  account,
  isMobile,
}) => {
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 })
  await page
    .getByRole('link', { name: 'Profile settings', exact: true })
    .click()
  const name = page.getByLabel('Tenant name', { exact: true })
  const contact = page.getByLabel('Tenant phone or email', { exact: true })
  const address = page.getByLabel('Rental property address', { exact: true })
  await name.fill('Jamie Tenant')
  await contact.fill('jamie@example.test')
  await address.fill('Flat 12, Green Street')
  await page.getByRole('button', { name: 'Save tenant', exact: true }).click()
  await expect(page.locator('.saved-tenant-status')).toHaveText(
    'Tenant saved to your account.',
  )
  await expect(
    page.getByRole('combobox', { name: 'Saved tenant' }),
  ).toHaveCount(0)
  await page
    .getByRole('link', { name: 'Back to invoice builder', exact: true })
    .click()
  const billName = page.getByPlaceholder('e.g. Jamie Parker')
  const billContact = page.getByPlaceholder('How to reach your tenant')
  const billAddress = page.getByPlaceholder(
    'Flat / house number, street, city, postal code',
  )
  await expect(billName).toHaveValue('Jamie Tenant')
  await expect(billContact).toHaveValue('jamie@example.test')
  await expect(billAddress).toHaveValue('Flat 12, Green Street')
  await expect(
    page.getByRole('button', { name: 'Update saved tenant' }),
  ).toHaveCount(0)
  await billAddress.fill('Bill-only address')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  let requests = 0
  await page.route('**/api/tenants', async (route) => {
    if (route.request().method() === 'GET') requests++
    await route.continue()
  })
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Use saved tenant', exact: true }),
  ).toBeEnabled()
  await expect(billAddress).toHaveValue('Bill-only address')
  expect(requests).toBe(0)
  await page
    .getByRole('button', { name: 'Use saved tenant', exact: true })
    .click()
  await expect(billAddress).toHaveValue('Flat 12, Green Street')
  await billName.fill('Second Tenant')
  await billContact.fill('9876543210')
  await billAddress.fill('Second rental address')
  await page
    .getByRole('button', { name: 'Save as new tenant', exact: true })
    .click()
  await expect(page.locator('.saved-tenant-status')).toHaveText(
    'Tenant saved to your account.',
  )
  const picker = page.getByRole('combobox', { name: 'Saved tenant' })
  await picker.selectOption({ label: 'Jamie Tenant' })
  await expect(billAddress).toHaveValue('Flat 12, Green Street')
  await expect(billContact).toHaveValue('jamie@example.test')
  await page
    .locator('.party-grid')
    .screenshot({ path: test.info().outputPath('tenant-selector.png') })
  expect(
    (await new AxeBuilder({ page }).include('.party-grid').analyze())
      .violations,
  ).toEqual([])
  await billContact.fill('updated@example.test')
  await page
    .getByRole('button', { name: 'Update saved tenant', exact: true })
    .click()
  await expect(page.locator('.saved-tenant-status')).toHaveText(
    'Tenant saved to your account.',
  )
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.getByRole('link', { name: 'Manage tenants', exact: true }).click()
  await expect(contact).toHaveValue('updated@example.test')
  page.on('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Remove saved tenant', exact: true })
    .click()
  await expect(page.locator('.saved-tenant-status')).toContainText(
    'Saved tenant removed.',
  )
  await expect(picker).toHaveCount(0)
  await page
    .getByRole('link', { name: 'Back to invoice builder', exact: true })
    .click()
  await expect(billName).toHaveValue('Jamie Tenant')
  await expect(billContact).toHaveValue('updated@example.test')
  expect(
    await page.evaluate(
      (id) => !!sessionStorage.getItem(`rentflow:tenants:v1:${id}`),
      account.id,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) =>
        key.startsWith('rentflow:tenants:'),
      ),
    ),
  ).toBe(false)
})

test('uncached single landlord and tenant both prefill an empty draft', async ({
  page,
  account,
}) => {
  const headers = {
    Origin: 'http://127.0.0.1:3100',
    'X-RentFlow-User': account.id,
  }
  expect(
    (
      await page.request.post('/api/landlords', {
        headers,
        data: { name: 'Only Landlord', phone: '123' },
      })
    ).status(),
  ).toBe(200)
  expect(
    (
      await page.request.post('/api/tenants', {
        headers,
        data: {
          name: 'Only Tenant',
          contact: 'tenant@example.test',
          address: 'Only address',
        },
      })
    ).status(),
  ).toBe(200)
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue(
    'Only Landlord',
  )
  await expect(page.getByPlaceholder('e.g. Jamie Parker')).toHaveValue(
    'Only Tenant',
  )
  await expect(
    page.getByPlaceholder('Flat / house number, street, city, postal code'),
  ).toHaveValue('Only address')
  await expect(
    page.getByRole('combobox', { name: /^Saved (landlord|tenant)$/ }),
  ).toHaveCount(0)
})

test('tenant API validates details and rejects wrong accounts, origins and guests', async ({
  page,
  account,
}) => {
  const headers = {
    Origin: 'http://127.0.0.1:3100',
    'X-RentFlow-User': account.id,
  }
  const details = {
    name: 'Private Tenant',
    contact: 'test@example.test',
    address: 'Saved address',
  }
  const created = await page.request.post('/api/tenants', {
    headers,
    data: details,
  })
  expect(created.status()).toBe(200)
  const tenant = await created.json()
  expect(
    (
      await page.request.post('/api/tenants', { headers, data: details })
    ).status(),
  ).toBe(409)
  for (const invalid of [
    { ...details, name: ' ' },
    { ...details, contact: 'x'.repeat(151) },
    { ...details, address: 'x'.repeat(301) },
  ]) {
    expect(
      (
        await page.request.post('/api/tenants', { headers, data: invalid })
      ).status(),
    ).toBe(400)
  }
  expect(
    (
      await page.request.post('/api/tenants', {
        headers: { ...headers, Origin: 'https://example.test' },
        data: details,
      })
    ).status(),
  ).toBe(403)
  expect(
    (
      await page.request.get('/api/tenants', {
        headers: { ...headers, 'X-RentFlow-User': 'other' },
      })
    ).status(),
  ).toBe(409)
  expect(
    (
      await page.request.patch('/api/tenants', {
        headers,
        data: { ...details, id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
      })
    ).status(),
  ).toBe(404)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  expect((await page.request.get('/api/tenants', { headers })).status()).toBe(
    401,
  )
  expect(
    (
      await page.request.delete('/api/tenants', {
        headers,
        data: { id: tenant.id },
      })
    ).status(),
  ).toBe(401)
})
