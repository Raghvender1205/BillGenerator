'use client'
import Link from 'next/link'
import { Plus, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ChargeRate, ChargeRateInput } from '../lib/charge-rates'

export default function ChargePresets({
  rates,
  loading,
  error,
  refresh,
  onAdd,
  signedIn,
  children,
}: {
  rates: ChargeRate[]
  loading: boolean
  error: string
  refresh: () => void
  onAdd: (rate: ChargeRateInput & { id?: string }) => void
  signedIn: boolean
  children: ReactNode
}) {
  if (!signedIn) return children
  const selected = rates.filter((rate) => rate.enabled)
  return (
    <div className="charge-shortcuts">
      {loading ? (
        <p role="status">Loading your charges…</p>
      ) : error ? (
        <>
          <p className="form-error" role="alert">
            {error}
          </p>
          <button type="button" className="text-button" onClick={refresh}>
            Retry loading charges
          </button>
        </>
      ) : selected.length ? (
        <>
          {selected.map((charge) => (
            <button
              key={charge.id}
              type="button"
              className="text-button charge-shortcut"
              aria-label={`Add ${charge.name}`}
              onClick={() => onAdd(charge)}
            >
              <Plus size={15} aria-hidden="true" />
              {charge.name}
            </button>
          ))}
        </>
      ) : (
        <p>
          Rent is ready.{' '}
          <Link href="/settings">
            Set up your additional charges in Settings
          </Link>{' '}
          whenever you need them.
        </p>
      )}
      {children}
      {!loading && !error && selected.length > 0 ? (
        <Link
          className="text-button charge-settings-link"
          href="/settings"
          aria-label="Charge settings"
        >
          <Settings2 size={14} aria-hidden="true" />
          Settings
        </Link>
      ) : null}
    </div>
  )
}
