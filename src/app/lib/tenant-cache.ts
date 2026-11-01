import { validTenant, type SavedTenant } from './tenants'

const prefix = 'rentflow:tenants:v1:'
export const tenantCacheLifetime = 5 * 60 * 1000
export type TenantCache = {
  profiles: SavedTenant[]
  selected: string
  cachedAt: number
}

export function readTenantCache(userId: string): TenantCache | null {
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
          validTenant(profile) &&
          typeof (profile as SavedTenant).id === 'string' &&
          (profile as SavedTenant).id.length === 36,
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

export function writeTenantCache(userId: string, value: TenantCache) {
  try {
    sessionStorage.setItem(
      prefix + userId,
      JSON.stringify({
        ...value,
        profiles: value.profiles.map(({ id, name, contact, address }) => ({
          id,
          name,
          contact,
          address,
        })),
      }),
    )
  } catch {
    // Saving and selecting profiles still work when browser storage is blocked.
  }
}

export function clearTenantCache() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index)
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key)
    }
  } catch {
    // Sign-out must work even when browser storage is blocked.
  }
}
