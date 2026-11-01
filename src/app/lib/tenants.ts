import type { Invoice } from './invoice'

export type TenantDetails = Invoice['tenant']
export type SavedTenant = TenantDetails & { id: string }

export function validTenant(value: unknown): value is TenantDetails {
  if (!value || typeof value !== 'object') return false
  const details = value as Record<string, unknown>
  return (
    typeof details.name === 'string' &&
    details.name.trim().length > 0 &&
    details.name.length <= 100 &&
    typeof details.contact === 'string' &&
    details.contact.length <= 150 &&
    typeof details.address === 'string' &&
    details.address.length <= 300
  )
}
