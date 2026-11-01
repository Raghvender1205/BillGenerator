'use client'

import { useEffect, useRef, useState } from 'react'
import type { LandlordDetails, SavedLandlord } from '../lib/landlords'
import { validLandlord } from '../lib/landlords'
import {
  landlordCacheLifetime,
  readLandlordCache,
  writeLandlordCache,
} from '../lib/landlord-cache'

export default function SavedLandlords({
  userId,
  landlord,
  onSelect,
  rememberSelection = true,
}: {
  userId: string
  landlord: LandlordDetails
  onSelect: (landlord: LandlordDetails) => void
  rememberSelection?: boolean
}) {
  const [profiles, setProfiles] = useState<SavedLandlord[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const cachedAt = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve()
      .then(async () => {
        if (controller.signal.aborted) return
        const cache = readLandlordCache(userId)
        if (
          retry === 0 &&
          cache &&
          Date.now() - cache.cachedAt < landlordCacheLifetime
        ) {
          cachedAt.current = cache.cachedAt
          setProfiles(cache.profiles)
          setSelected(
            rememberSelection &&
              cache.profiles.some((profile) => profile.id === cache.selected)
              ? cache.selected
              : '',
          )
          return
        }
        const response = await fetch('/api/landlords', {
          cache: 'no-store',
          headers: { 'X-RentFlow-User': userId },
          signal: controller.signal,
        })
        const data: SavedLandlord[] & { error?: string } = await response.json()
        if (!response.ok)
          throw new Error(data.error || 'Could not load saved landlords.')
        if (!controller.signal.aborted) {
          const id = data.some((profile) => profile.id === cache?.selected)
            ? cache!.selected
            : ''
          cachedAt.current = Date.now()
          setProfiles(data)
          setSelected(rememberSelection ? id : '')
          writeLandlordCache(userId, {
            profiles: data,
            selected: id,
            cachedAt: cachedAt.current,
          })
        }
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [userId, retry, rememberSelection])

  async function save(method: 'POST' | 'PATCH' | 'DELETE') {
    if (
      method === 'DELETE' &&
      !window.confirm(
        'Remove this saved landlord? Details already on invoices will stay unchanged.',
      )
    )
      return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/landlords', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-RentFlow-User': userId,
        },
        body: JSON.stringify({ ...landlord, id: selected }),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || 'Could not save this landlord.')
      if (method === 'DELETE') {
        const next = profiles.filter((profile) => profile.id !== selected)
        setProfiles(next)
        setSelected('')
        cachedAt.current = Date.now()
        writeLandlordCache(userId, {
          profiles: next,
          selected: '',
          cachedAt: cachedAt.current,
        })
        setMessage(
          'Saved landlord removed. Your invoice details are unchanged.',
        )
      } else {
        const next = [
          ...profiles.filter((profile) => profile.id !== data.id),
          data,
        ].sort((a, b) => a.name.localeCompare(b.name))
        setProfiles(next)
        setSelected(data.id)
        cachedAt.current = Date.now()
        writeLandlordCache(userId, {
          profiles: next,
          selected: data.id,
          cachedAt: cachedAt.current,
        })
        setMessage('Landlord saved to your account.')
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not update saved landlords.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="saved-landlords" aria-busy={loading || busy}>
      <label>
        Saved landlord
        <select
          value={selected}
          disabled={loading || busy}
          onChange={(event) => {
            const id = event.target.value
            setSelected(id)
            writeLandlordCache(userId, {
              profiles,
              selected: id,
              cachedAt: cachedAt.current,
            })
            setMessage('')
            const profile = profiles.find((profile) => profile.id === id)
            if (profile) {
              onSelect({ name: profile.name, phone: profile.phone })
              setMessage('Landlord details filled into this invoice.')
            }
          }}
        >
          <option value="">
            {loading
              ? 'Loading saved landlords…'
              : 'Enter details or choose a landlord'}
          </option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
              {profile.phone ? ` · ${profile.phone}` : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="saved-landlords-hint">
        Save the details below to reuse them on future bills.
      </p>
      <div className="saved-landlord-actions">
        <button
          type="button"
          className="text-button"
          aria-label={selected ? 'Save as new landlord' : 'Save landlord'}
          disabled={loading || busy || !validLandlord(landlord)}
          onClick={() => void save('POST')}
        >
          {busy ? 'Please wait…' : selected ? 'Save as new' : 'Save landlord'}
        </button>
        {selected ? (
          <>
            <button
              type="button"
              className="text-button"
              aria-label="Update saved landlord"
              disabled={loading || busy || !validLandlord(landlord)}
              onClick={() => void save('PATCH')}
            >
              Update
            </button>
            <button
              type="button"
              className="text-button"
              aria-label="Remove saved landlord"
              disabled={loading || busy}
              onClick={() => void save('DELETE')}
            >
              Remove
            </button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="text-button"
        disabled={busy || loading}
        onClick={() => {
          setLoading(true)
          setError('')
          setRetry((value) => value + 1)
        }}
      >
        Refresh saved landlords
      </button>
      <p className="saved-landlord-status" role="status">
        {message}
      </p>
    </div>
  )
}
