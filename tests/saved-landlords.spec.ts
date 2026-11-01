import { test, expect } from './fixtures'

test('one saved landlord stays compact and multiple landlords offer a selector', async ({
  page,
  isMobile,
}) => {
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 })
  const name = page.getByPlaceholder('e.g. Alex Morgan')
  const phone = page.getByPlaceholder('e.g. +91 98765 43210')
  const picker = page.getByRole('combobox', { name: 'Saved landlord' })
  const status = page.locator('.saved-landlord-status')
  await expect(picker).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Save landlord', exact: true }),
  ).toBeDisabled()
  await name.fill('Saved Landlord A')
  await phone.fill('9876543210')
  await page.getByRole('button', { name: 'Save landlord', exact: true }).click()
  await expect(status).toHaveText('Landlord saved to your account.')
  await expect(picker).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Update saved landlord', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Refresh saved landlords' }),
  ).toHaveCount(0)
  await page
    .locator('.party-grid')
    .screenshot({ path: test.info().outputPath('saved-people-light.png') })
  await page
    .locator('html')
    .evaluate((element) => element.classList.add('dark'))
  await page
    .locator('.party-grid')
    .screenshot({ path: test.info().outputPath('saved-people-dark.png') })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await name.fill('Saved Landlord B')
  await phone.fill('9123456780')
  await page
    .getByRole('button', { name: 'Save as new landlord', exact: true })
    .click()
  await expect(status).toHaveText('Landlord saved to your account.')
  await expect(picker).toBeVisible()
  await picker.selectOption({ label: 'Saved Landlord A' })
  await expect(name).toHaveValue('Saved Landlord A')
  await name.fill('Updated Landlord A')
  await page
    .getByRole('button', { name: 'Update saved landlord', exact: true })
    .click()
  await expect(status).toHaveText('Landlord saved to your account.')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.reload()
  await picker.selectOption({ label: 'Saved Landlord B' })
  await expect(name).toHaveValue('Saved Landlord B')
  await picker.selectOption({ label: 'Updated Landlord A' })
  await page
    .getByRole('link', { name: 'Manage landlords', exact: true })
    .click()
  page.on('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Remove saved landlord', exact: true })
    .click()
  await expect(status).toContainText('Saved landlord removed.')
  await expect(picker).toHaveCount(0)
  await page
    .getByRole('link', { name: 'Back to invoice builder', exact: true })
    .click()
  await expect(name).toHaveValue('Updated Landlord A')
  await page
    .getByRole('button', { name: 'Use saved landlord', exact: true })
    .click()
  await expect(name).toHaveValue('Saved Landlord B')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) =>
        key.startsWith('rentflow:landlords:'),
      ),
    ),
  ).toBe(false)
})

test('single landlord preloads from cache while preserving bill-only edits', async ({
  page,
  account,
}) => {
  const name = page.getByPlaceholder('e.g. Alex Morgan')
  await name.fill('Cached Landlord')
  await page.getByRole('button', { name: 'Save landlord', exact: true }).click()
  await expect(page.locator('.saved-landlord-status')).toHaveText(
    'Landlord saved to your account.',
  )
  await name.fill('Edited on this bill')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  let requests = 0
  await page.route('**/api/landlords', async (route) => {
    if (route.request().method() === 'GET') requests++
    await route.continue()
  })
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Use saved landlord', exact: true }),
  ).toBeEnabled()
  await expect(name).toHaveValue('Edited on this bill')
  expect(requests).toBe(0)
  await page
    .getByRole('button', { name: 'Use saved landlord', exact: true })
    .click()
  await expect(name).toHaveValue('Cached Landlord')
  const cacheKey = `rentflow:landlords:v1:${account.id}`
  await page.evaluate((key) => {
    const value = JSON.parse(sessionStorage.getItem(key)!)
    value.cachedAt = Date.now() - 6 * 60 * 1000
    sessionStorage.setItem(key, JSON.stringify(value))
  }, cacheKey)
  await page.reload()
  await expect(page.locator('.saved-landlords')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  expect(requests).toBe(1)
  await page.evaluate(
    (key) => sessionStorage.setItem(key, 'invalid-json'),
    cacheKey,
  )
  await page.reload()
  await expect(page.locator('.saved-landlords')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  expect(requests).toBe(2)
  await expect(
    page.getByRole('combobox', { name: 'Saved landlord' }),
  ).toHaveCount(0)
})

test('saved-landlord requests reject invalid input, wrong accounts, and anonymous access', async ({
  page,
  account,
}) => {
  const headers = {
    Origin: 'http://127.0.0.1:3100',
    'X-RentFlow-User': account.id,
  }
  const created = await page.request.post('/api/landlords', {
    headers,
    data: { name: 'API Landlord', phone: '123' },
  })
  expect(created.status()).toBe(200)
  const profile = await created.json()
  const duplicate = await page.request.post('/api/landlords', {
    headers,
    data: { name: 'API Landlord', phone: '123' },
  })
  expect(duplicate.status()).toBe(409)
  expect(
    (
      await page.request.post('/api/landlords', {
        headers,
        data: { name: ' ', phone: '' },
      })
    ).status(),
  ).toBe(400)
  expect(
    (
      await page.request.post('/api/landlords', {
        headers: { ...headers, Origin: 'https://example.test' },
        data: { name: 'Bad origin', phone: '' },
      })
    ).status(),
  ).toBe(403)
  expect(
    (
      await page.request.get('/api/landlords', {
        headers: { ...headers, 'X-RentFlow-User': 'other-account' },
      })
    ).status(),
  ).toBe(409)
  const missing = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  expect(
    (
      await page.request.patch('/api/landlords', {
        headers,
        data: { id: missing, name: 'No profile', phone: '' },
      })
    ).status(),
  ).toBe(404)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  expect((await page.request.get('/api/landlords', { headers })).status()).toBe(
    401,
  )
  expect(
    (
      await page.request.delete('/api/landlords', {
        headers,
        data: { id: profile.id },
      })
    ).status(),
  ).toBe(401)
})
