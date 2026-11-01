'use client'
import Link from 'next/link'
import type { ChargeRate, ChargeRateInput } from '../lib/charge-rates'

export default function ChargePresets({
  rates,
  loading,
  error,
  refresh,
  onAdd,
  signedIn,
}: {
  rates: ChargeRate[]
  loading: boolean
  error: string
  refresh: () => void
  onAdd: (rate: ChargeRateInput & { id?: string }) => void
  signedIn: boolean
}) {
  if (!signedIn) return null
  const selected = rates.filter((rate) => rate.enabled)
  return (
    <div className="charge-presets">
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
          <label>
            Add one of your charges
            <select
              value=""
              onChange={(event) => {
                const charge = selected.find(
                  (rate) => rate.id === event.target.value,
                )
                if (charge) onAdd(charge)
              }}
            >
              <option value="">Choose a charge</option>
              {selected.map((charge) => (
                <option key={charge.id} value={charge.id}>
                  {charge.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            <Link href="/settings">Manage my charges</Link>
          </p>
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
    </div>
  )
}
