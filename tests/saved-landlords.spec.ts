import { test, expect } from './fixtures'

test('saved landlords can be reused, edited, and removed without changing invoice details', async ({
  page,
  isMobile,
}) => {
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 })
  const name = page.getByPlaceholder('e.g. Alex Morgan')
  const phone = page.getByPlaceholder('e.g. +91 98765 43210')
  const picker = page.getByRole('combobox', { name: 'Saved landlord' })
  const status = page.locator('.saved-landlord-status')
  await expect(picker).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Save landlord', exact: true }),
  ).toBeDisabled()
  await name.fill('Saved Landlord A')
  await phone.fill('9876543210')
  await page.getByRole('button', { name: 'Save landlord', exact: true }).click()
  await expect(status).toHaveText('Landlord saved to your account.')
  const firstId = await picker.inputValue()
  await page
    .locator('.saved-landlords')
    .screenshot({ path: test.info().outputPath('saved-landlords-light.png') })
  await page
    .locator('html')
    .evaluate((element) => element.classList.add('dark'))
  await page
    .locator('.saved-landlords')
    .screenshot({ path: test.info().outputPath('saved-landlords-dark.png') })
  await page
    .locator('html')
    .evaluate((element) => element.classList.remove('dark'))
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
  await picker.selectOption(firstId)
  await expect(name).toHaveValue('Saved Landlord A')
  await expect(phone).toHaveValue('9876543210')
  await name.fill('Updated Landlord A')
  await page
    .getByRole('button', { name: 'Update saved landlord', exact: true })
    .click()
  await expect(status).toHaveText('Landlord saved to your account.')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  await page.reload()
  await expect(picker).toBeEnabled()
  await picker.selectOption({ label: 'Saved Landlord B · 9123456780' })
  await expect(name).toHaveValue('Saved Landlord B')
  await picker.selectOption(firstId)
  await expect(name).toHaveValue('Updated Landlord A')
  await expect(phone).toHaveValue('9876543210')
  page.on('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Remove saved landlord', exact: true })
    .click()
  await expect(status).toContainText('Saved landlord removed.')
  await expect(name).toHaveValue('Updated Landlord A')
  await expect(picker.locator('option')).toHaveCount(2)
  await page.getByRole('button', { name: 'Start fresh', exact: true }).click()
  await expect(name).toHaveValue('Updated Landlord A')
  await picker.selectOption({ label: 'Saved Landlord B · 9123456780' })
  await expect(name).toHaveValue('Saved Landlord B')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(picker).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) =>
        key.startsWith('rentflow:landlords:'),
      ),
    ),
  ).toBe(false)
  await expect(page.getByPlaceholder('e.g. Alex Morgan')).toHaveValue('')
})

test('selected landlord preloads from the account cache without a list request', async ({
  page,
  account,
}) => {
  const picker = page.getByRole('combobox', { name: 'Saved landlord' })
  await expect(picker).toBeEnabled()
  const name = page.getByPlaceholder('e.g. Alex Morgan')
  await name.fill('Cached Landlord')
  await page.getByRole('button', { name: 'Save landlord', exact: true }).click()
  await expect(page.locator('.saved-landlord-status')).toHaveText(
    'Landlord saved to your account.',
  )
  const selected = await picker.inputValue()
  // Draft-only edits must not be overwritten by a cached saved profile.
  await name.fill('Edited on this bill')
  await expect(page.locator('.editor-bottom [role="status"]')).toHaveText(
    'All changes saved to your account',
  )
  let listRequests = 0
  await page.route('**/api/landlords', async (route) => {
    if (route.request().method() === 'GET') listRequests++
    await route.continue()
  })
  await page.reload()
  await expect(picker).toBeEnabled()
  await expect(picker).toHaveValue(selected)
  await expect(name).toHaveValue('Edited on this bill')
  expect(listRequests).toBe(0)
  await picker.selectOption('')
  await picker.selectOption(selected)
  await expect(name).toHaveValue('Cached Landlord')
  await page.getByRole('button', { name: 'Refresh saved landlords' }).click()
  await expect(picker).toBeEnabled()
  expect(listRequests).toBe(1)
  const cacheKey = `rentflow:landlords:v1:${account.id}`
  await page.evaluate((key) => {
    const cached = JSON.parse(sessionStorage.getItem(key)!)
    cached.cachedAt = Date.now() - 6 * 60 * 1000
    sessionStorage.setItem(key, JSON.stringify(cached))
  }, cacheKey)
  await page.reload()
  await expect(picker).toBeEnabled()
  await expect(picker).toHaveValue(selected)
  expect(listRequests).toBe(2)
  await page.evaluate(
    (key) => sessionStorage.setItem(key, 'invalid-json'),
    cacheKey,
  )
  await page.reload()
  await expect(picker).toBeEnabled()
  expect(listRequests).toBe(3)
  await expect(picker.locator('option')).toHaveCount(2)
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
