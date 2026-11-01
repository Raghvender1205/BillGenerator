import {
  emptyInvoice,
  isInvoice,
  localDate,
  validParty,
  type Invoice,
} from './invoice'

const DRAFT_KEY = 'rentflow_draft_v1'
export function readGuestDraft(): Invoice | null {
  try {
    const draft: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    if (isInvoice(draft))
      return {
        landlord: draft.landlord,
        tenant: draft.tenant,
        number: draft.number,
        due: draft.due,
        items: draft.items,
      }
  } catch {
    /* A blocked or corrupt store must not prevent editing. */
  }
  return null
}
export function createGuestInvoiceStore() {
  let current: Invoice | null = null
  async function create(): Promise<Invoice> {
    const date = new Date()
    date.setDate(1)
    const due = localDate(date)
    const month = due.slice(0, 7).replace('-', '')
    const key = `rentflow_invoice_sequence_v1_${month}`
    function allocate() {
      const previous = Number(localStorage.getItem(key) || '0')
      if (
        !Number.isSafeInteger(previous) ||
        previous < 0 ||
        previous >= Number.MAX_SAFE_INTEGER
      )
        throw new Error('Invalid saved counter')
      localStorage.setItem(key, String(previous + 1))
      return `INV-${month}-${String(previous + 1).padStart(3, '0')}`
    }
    let number: string
    try {
      number = navigator.locks
        ? await navigator.locks.request(key, allocate)
        : allocate()
    } catch {
      number = `INV-${month}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    }
    const previous = current || readGuestDraft()
    current = {
      ...emptyInvoice,
      number,
      due,
      landlord: previous?.landlord || { name: '', phone: '' },
      tenant: previous?.tenant || { name: '', address: '', contact: '' },
    }
    return current
  }
  return {
    restore: async () => {
      current = readGuestDraft()
      if (current) return current
      const draft = await create()
      try {
        const landlord = JSON.parse(
          localStorage.getItem('rentflow_landlord_info') || 'null',
        )
        const tenant = JSON.parse(
          localStorage.getItem('rentflow_tenant_info') || 'null',
        )
        if (validParty(landlord, ['name', 'phone'])) draft.landlord = landlord
        if (validParty(tenant, ['name', 'address', 'contact']))
          draft.tenant = tenant
      } catch {
        /* Legacy details are optional. */
      }
      return draft
    },
    create,
    save: async (invoice: Invoice) => {
      current = invoice
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice))
      } catch {
        throw new Error(
          'Browser storage is unavailable. Keep this tab open and download your invoice before leaving.',
        )
      }
    },
  }
}
