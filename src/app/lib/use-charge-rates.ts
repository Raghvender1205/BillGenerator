'use client'
import { useEffect, useState } from 'react'
import {
  validChargeRate,
  type ChargeRate,
  type ChargeRateInput,
} from './charge-rates'

const prefix = 'rentflow:charge-rates:v2:'
export function cachedChargeRates(userId: string): ChargeRate[] | null {
  try {
    const raw = sessionStorage.getItem(prefix + userId)
    if (!raw || raw.length > 1000000) return null
    const cache = JSON.parse(raw)
    if (
      !Number.isFinite(cache.at) ||
      cache.at > Date.now() ||
      Date.now() - cache.at > 5 * 60 * 1000 ||
      !Array.isArray(cache.rates) ||
      !cache.rates.every(
        (row: ChargeRate) =>
          validChargeRate(row) &&
          typeof row.id === 'string' &&
          typeof row.enabled === 'boolean' &&
          (row.mode === 'fixed' || row.mode === 'per_unit'),
      )
    )
      return null
    return cache.rates
  } catch {
    return null
  }
}
function cacheRates(userId: string, rates: ChargeRate[]) {
  try {
    sessionStorage.setItem(
      prefix + userId,
      JSON.stringify({ at: Date.now(), rates }),
    )
  } catch {
    /* Storage is optional. */
  }
}
export function clearChargeRateCache() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('rentflow:charge-rates:'))
        sessionStorage.removeItem(key)
    }
  } catch {
    /* Sign-out still works without browser storage. */
  }
}
export function useChargeRates(userId?: string) {
  const [rates, setRates] = useState<ChargeRate[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    Promise.resolve()
      .then(async () => {
        if (controller.signal.aborted) return
        const cached = retry === 0 ? cachedChargeRates(userId) : null
        if (cached) {
          setRates(cached)
          return
        }
        const response = await fetch('/api/charge-rates', {
          headers: { 'X-RentFlow-User': userId },
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok)
          throw Error(data.error || 'Could not load saved rates.')
        if (!controller.signal.aborted) {
          setRates(data)
          cacheRates(userId, data)
        }
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [userId, retry])
  function refresh() {
    setLoading(true)
    setError('')
    setRetry((value) => value + 1)
  }
  async function save(
    method: 'POST' | 'PATCH' | 'DELETE',
    input: Partial<ChargeRateInput> & { id?: string },
  ) {
    if (!userId) throw Error('Sign in to save charge rates.')
    const response = await fetch('/api/charge-rates', {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-RentFlow-User': userId,
      },
      body: JSON.stringify(input),
    })
    const data = await response.json()
    if (!response.ok) throw Error(data.error || 'Could not save this rate.')
    const next =
      method === 'DELETE'
        ? rates.filter((row) => row.id !== data.id)
        : [...rates.filter((row) => row.id !== data.id), data].sort((a, b) =>
            a.name.localeCompare(b.name),
          )
    setRates(next)
    cacheRates(userId, next)
    return data as ChargeRate
  }
  async function savePreferences(
    charges: (ChargeRateInput & { id?: string })[],
  ) {
    if (!userId) throw Error('Sign in to save your charges.')
    const response = await fetch('/api/charge-rates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-RentFlow-User': userId,
      },
      body: JSON.stringify({ charges }),
    })
    const data = await response.json()
    if (!response.ok) throw Error(data.error || 'Could not save your charges.')
    setRates(data)
    cacheRates(userId, data)
    return data as ChargeRate[]
  }
  return { rates, loading, error, refresh, save, savePreferences }
}
