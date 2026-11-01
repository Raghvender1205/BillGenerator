import { validLandlord, type SavedLandlord } from './landlords'

const prefix = 'rentflow:landlords:v1:'
export const landlordCacheLifetime = 5 * 60 * 1000
export type LandlordCache = {
  profiles: SavedLandlord[]
  selected: string
  cachedAt: number
}

export function readLandlordCache(userId: string): LandlordCache | null {
  try {
    const raw = sessionStorage.getItem(prefix + userId)
    if (!raw || raw.length > 1_000_000) return null
    const value = JSON.parse(raw)
    if (
      !value ||
      !Array.isArray(value.profiles) ||
      value.profiles.length > 1000 ||
      !value.profiles.every(
        (profile: unknown) =>
          validLandlord(profile) &&
          typeof (profile as SavedLandlord).id === 'string' &&
          (profile as SavedLandlord).id.length === 36,
      ) ||
      typeof value.selected !== 'string' ||
      !Number.isFinite(value.cachedAt) ||
      value.cachedAt < 0 ||
      value.cachedAt > Date.now()
    )
      return null
    return value
  } catch {
    // Disabled or corrupt browser storage falls back to the authenticated API.
    return null
  }
}

export function writeLandlordCache(userId: string, value: LandlordCache) {
  try {
    sessionStorage.setItem(
      prefix + userId,
      JSON.stringify({
        ...value,
        profiles: value.profiles.map(({ id, name, phone }) => ({
          id,
          name,
          phone,
        })),
      }),
    )
  } catch {
    // Saving and selecting profiles still work when browser storage is blocked.
  }
}

export function clearLandlordCache() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index)
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key)
    }
  } catch {
    // Sign-out must work even when browser storage is blocked.
  }
}
