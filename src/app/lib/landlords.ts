import type { Invoice } from './invoice'

export type LandlordDetails = Invoice['landlord']
export type SavedLandlord = LandlordDetails & { id: string }

export function validLandlord(value: unknown): value is LandlordDetails {
  if (!value || typeof value !== 'object') return false
  const details = value as Record<string, unknown>
  return (
    typeof details.name === 'string' &&
    details.name.trim().length > 0 &&
    details.name.length <= 100 &&
    typeof details.phone === 'string' &&
    details.phone.length <= 40
  )
}
