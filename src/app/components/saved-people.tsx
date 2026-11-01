'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Details = { name: string }
type Cache<T> = {
  profiles: (T & { id: string })[]
  selected: string
  cachedAt: number
}

export default function SavedPeople<T extends Details>({
  userId,
  kind,
  details,
  onSelect,
  manager = false,
  valid,
  readCache,
  writeCache,
  lifetime,
  describe,
}: {
  userId: string
  kind: 'landlord' | 'tenant'
  details: T
  onSelect: (details: T) => void
  manager?: boolean
  valid: (value: unknown) => value is T
  readCache: (userId: string) => Cache<T> | null
  writeCache: (userId: string, cache: Cache<T>) => void
  lifetime: number
  describe: (details: T) => string
}) {
  const [profiles, setProfiles] = useState<(T & { id: string })[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const cachedAt = useRef(0)
  const current = useRef({ details, onSelect })
  useEffect(() => {
    current.current = { details, onSelect }
  })
  const title = kind === 'landlord' ? 'Landlord' : 'Tenant'

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve()
      .then(async () => {
        if (controller.signal.aborted) return
        const cache = readCache(userId)
        let data = cache?.profiles ?? []
        let timestamp = cache?.cachedAt ?? 0
        if (retry || !cache || Date.now() - timestamp >= lifetime) {
          const response = await fetch(`/api/${kind}s`, {
            cache: 'no-store',
            headers: { 'X-RentFlow-User': userId },
            signal: controller.signal,
          })
          data = await response.json()
          if (!response.ok)
            throw new Error(`Could not load saved ${kind}s. Please retry.`)
          timestamp = Date.now()
        }
        if (controller.signal.aborted) return
        const id =
          data.length === 1
            ? data[0].id
            : data.some((p) => p.id === cache?.selected)
              ? cache!.selected
              : ''
        cachedAt.current = timestamp
        setProfiles(data)
        setSelected(id)
        writeCache(userId, {
          profiles: data,
          selected: id,
          cachedAt: timestamp,
        })
        const profile = data.find((p) => p.id === id)
        // Restored drafts and edits always take precedence over saved defaults.
        if (
          profile &&
          (manager ||
            Object.values(current.current.details).every((value) => !value))
        ) {
          current.current.onSelect(profile)
        }
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [userId, kind, retry, manager, readCache, writeCache, lifetime])

  function select(id: string) {
    setSelected(id)
    writeCache(userId, { profiles, selected: id, cachedAt: cachedAt.current })
    setMessage('')
    const profile = profiles.find((p) => p.id === id)
    if (profile) {
      onSelect(profile)
      setMessage(`${title} details filled into this invoice.`)
    }
  }

  async function save(method: 'POST' | 'PATCH' | 'DELETE') {
    if (
      method === 'DELETE' &&
      !window.confirm(
        `Remove this saved ${kind}? Details already on invoices will stay unchanged.`,
      )
    )
      return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/${kind}s`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-RentFlow-User': userId,
        },
        body: JSON.stringify({ ...details, id: selected }),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || `Could not save this ${kind}.`)
      const next =
        method === 'DELETE'
          ? profiles.filter((p) => p.id !== selected)
          : [...profiles.filter((p) => p.id !== data.id), data].sort((a, b) =>
              a.name.localeCompare(b.name),
            )
      const id =
        method === 'DELETE' ? (next.length === 1 ? next[0].id : '') : data.id
      setProfiles(next)
      setSelected(id)
      cachedAt.current = Date.now()
      writeCache(userId, {
        profiles: next,
        selected: id,
        cachedAt: cachedAt.current,
      })
      setMessage(
        method === 'DELETE'
          ? `Saved ${kind} removed. Your invoice details are unchanged.`
          : `${title} saved to your account.`,
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : `Could not update saved ${kind}s.`,
      )
    } finally {
      setBusy(false)
    }
  }

  const profile = profiles.find((p) => p.id === selected)
  const matches =
    !!profile &&
    Object.keys(details)
      .filter((key) => key !== 'id')
      .every((key) => details[key as keyof T] === profile[key as keyof T])
  return (
    <div
      className={`saved-people saved-${kind}s${manager ? '' : ' saved-people-compact'}`}
      aria-busy={loading || busy}
    >
      {loading ? (
        <p role="status">Loading saved {kind}s…</p>
      ) : profiles.length > 1 ? (
        <label>
          Saved {kind}
          <select
            value={selected}
            disabled={busy}
            onChange={(event) => select(event.target.value)}
          >
            <option value="">Enter details or choose a {kind}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {profiles.some(
                  (other) => other.id !== p.id && other.name === p.name,
                )
                  ? ` · ${describe(p)}`
                  : ''}
              </option>
            ))}
          </select>
        </label>
      ) : profiles.length === 1 ? (
        <div className="saved-person-summary">
          <Check size={14} aria-hidden="true" />
          <span>
            Saved {kind}: <strong>{profiles[0].name}</strong>
          </span>
        </div>
      ) : null}
      <div className="saved-landlord-actions">
        {profile && !matches ? (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => select(selected)}
          >
            Use saved {kind}
          </button>
        ) : null}
        {manager || !matches ? (
          <button
            type="button"
            className="text-button"
            aria-label={selected ? `Save as new ${kind}` : `Save ${kind}`}
            disabled={loading || busy || !valid(details)}
            onClick={() => void save('POST')}
          >
            {busy ? 'Please wait…' : selected ? 'Save as new' : `Save ${kind}`}
          </button>
        ) : null}
        {selected && (manager || !matches) ? (
          <button
            type="button"
            className="text-button"
            aria-label={`Update saved ${kind}`}
            disabled={loading || busy || !valid(details) || matches}
            onClick={() => void save('PATCH')}
          >
            Update saved {kind}
          </button>
        ) : null}
        {manager && selected ? (
          <button
            type="button"
            className="text-button"
            aria-label={`Remove saved ${kind}`}
            disabled={loading || busy}
            onClick={() => void save('DELETE')}
          >
            Remove
          </button>
        ) : null}
        {!manager ? (
          <Link className="text-button" href="/settings">
            Manage {kind}s
          </Link>
        ) : null}
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {manager || error ? (
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
          Refresh saved {kind}s
        </button>
      ) : null}
      <p className={`saved-${kind}-status saved-person-status`} role="status">
        {message}
      </p>
    </div>
  )
}
