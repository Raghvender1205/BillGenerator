import { isInvoice, localDate, type Invoice } from './invoice'

export function createInvoiceStore(userId: string) {
  let revision = 0
  let queue: Promise<unknown> = Promise.resolve()
  let conflict = false
  async function request(method: string, body?: unknown) {
    const response = await fetch('/api/invoice', {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-RentFlow-User': userId,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json()
    if (!response.ok) {
      if (response.status === 409) conflict = true
      throw new Error(
        data.error ||
          'Your changes have not synced. Keep this tab open and try again.',
      )
    }
    return data
  }
  function serial<T>(job: () => Promise<T>): Promise<T> {
    const next = queue.catch(() => undefined).then(job)
    queue = next
    return next
  }
  function receive(data: { invoice: unknown; revision: number }) {
    if (
      !data ||
      !isInvoice(data.invoice) ||
      !Number.isSafeInteger(data.revision)
    )
      throw new Error(
        'Your saved invoice could not be read. Please contact support before starting a new one.',
      )
    revision = data.revision
    return data.invoice
  }
  async function create() {
    const date = new Date()
    date.setDate(1)
    return receive(await request('POST', { due: localDate(date) }))
  }
  return {
    restore: () =>
      serial(async () => {
        const data = await request('GET')
        return data ? receive(data) : create()
      }),
    create: () =>
      serial(async () => {
        if (conflict)
          throw new Error(
            'Reload to review the invoice saved on your other device.',
          )
        return create()
      }),
    save: (invoice: Invoice) => {
      return serial(async () => {
        if (conflict)
          throw new Error(
            'This invoice changed elsewhere. Download your copy before reloading.',
          )
        const data = await request('PUT', { invoice, revision })
        revision = data.revision
      })
    },
  }
}

export async function saveInvoiceHistory(userId: string, invoice: Invoice) {
  const response = await fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-RentFlow-User': userId },
    body: JSON.stringify({ invoice }),
  })
  if (!response.ok) throw new Error('Could not save invoice history.')
}
