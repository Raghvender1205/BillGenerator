import { calculatedAmount, validDecimal } from './charge-rates'

export type LineItem = {
  id: string
  title: string
  amount: string
  type: 'regular' | 'discount'
  quantity?: string
  rate?: string
  unit?: string
  chargeId?: string
  defaultRate?: string
}
export type Invoice = {
  landlord: { name: string; phone: string }
  tenant: { name: string; address: string; contact: string }
  number: string
  due: string
  items: LineItem[]
}
export const emptyInvoice: Invoice = {
  landlord: { name: '', phone: '' },
  tenant: { name: '', address: '', contact: '' },
  number: '',
  due: '',
  items: [{ id: 'rent', title: 'Monthly rent', amount: '', type: 'regular' }],
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
export const displayDate = (date: string) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'
export function amountValue(value: string) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0
    ? Math.round(number * 100) / 100
    : 0
}
export function totals(items: LineItem[]) {
  let subtotal = 0,
    discount = 0
  for (const item of items) {
    if (item.type === 'discount') discount += Math.round(lineAmount(item) * 100)
    else subtotal += Math.round(lineAmount(item) * 100)
  }
  return {
    subtotal: subtotal / 100,
    discount: discount / 100,
    total: (subtotal - discount) / 100,
  }
}
export function lineAmount(item: LineItem) {
  return amountValue(
    item.quantity === undefined
      ? item.amount
      : calculatedAmount(item.quantity, item.rate || ''),
  )
}
export function calculationLabel(item: LineItem) {
  return item.quantity === undefined
    ? ''
    : `${item.quantity || '0'} ${item.unit || 'units'} x Rs. ${item.rate || '0'} / ${item.unit || 'units'}`
}
function validCalculation(item: Record<string, unknown>) {
  if (
    item.quantity === undefined &&
    item.rate === undefined &&
    item.unit === undefined
  )
    return true
  return (
    item.type === 'regular' &&
    typeof item.quantity === 'string' &&
    (item.quantity === '' || validDecimal(item.quantity)) &&
    typeof item.rate === 'string' &&
    (item.rate === '' || validDecimal(item.rate)) &&
    typeof item.unit === 'string' &&
    item.unit.trim().length > 0 &&
    item.unit.length <= 24 &&
    (item.quantity === '' ||
      item.rate === '' ||
      calculatedAmount(item.quantity, item.rate) !== '') &&
    item.amount === calculatedAmount(item.quantity, item.rate)
  )
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
export function validParty(value: unknown, keys: string[]): boolean {
  return isRecord(value) && keys.every((key) => typeof value[key] === 'string')
}
export function isInvoice(value: unknown): value is Invoice {
  if (!isRecord(value)) return false
  return (
    validParty(value.landlord, ['name', 'phone']) &&
    validParty(value.tenant, ['name', 'address', 'contact']) &&
    ['number', 'due'].every((key) => typeof value[key] === 'string') &&
    ['due'].every(
      (key) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value[key] as string) &&
        !Number.isNaN(Date.parse(value[key] as string)),
    ) &&
    Array.isArray(value.items) &&
    value.items.length <= 500 &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.amount === 'string' &&
        ((item.chargeId === undefined && item.defaultRate === undefined) ||
          (typeof item.chargeId === 'string' &&
            /^[0-9a-f-]{36}$/i.test(item.chargeId) &&
            validDecimal(item.defaultRate) &&
            item.type === 'regular')) &&
        validCalculation(item) &&
        (item.amount === '' ||
          (Number.isFinite(Number(item.amount)) &&
            Number(item.amount) >= 0 &&
            Number(item.amount) <= 1000000000)) &&
        (item.type === 'regular' || item.type === 'discount'),
    )
  )
}
