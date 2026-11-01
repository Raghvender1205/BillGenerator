import { expect, type Page } from '@playwright/test'

export async function dragInvoiceItem(
  page: Page,
  title: string,
  beforeTitle: string,
  touch = false,
) {
  const source = page.getByRole('button', {
    name: `Reorder ${title}`,
    exact: true,
  })
  const target = page.getByRole('button', {
    name: `Reorder ${beforeTitle}`,
    exact: true,
  })
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const start = await source.boundingBox()
  const end = await target.boundingBox()
  if (!start || !end) throw new Error('Drag handles are not visible')
  const x = start.x + start.width / 2
  const y = start.y + start.height / 2
  const targetY = end.y + end.height / 2 - 8
  if (touch) {
    const session = await page.context().newCDPSession(page)
    try {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      })
      await expect
        .poll(() =>
          page.locator('.line-items .line-row[data-dragging="true"]').count(),
        )
        .toBeGreaterThan(0)
      for (let step = 1; step <= 15; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y + ((targetY - y) * step) / 15 }],
        })
      }
      await expect
        .poll(() =>
          page
            .locator('.line-items .description-input input')
            .first()
            .inputValue(),
        )
        .toBe(title)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    } finally {
      await session.detach()
    }
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, targetY, { steps: 20 })
    await expect
      .poll(() =>
        page
          .locator('.line-items .description-input input')
          .first()
          .inputValue(),
      )
      .toBe(title)
    await page.mouse.up()
  }
  await expect(
    page.locator('.line-items .description-input input').first(),
  ).toHaveValue(title)
}
