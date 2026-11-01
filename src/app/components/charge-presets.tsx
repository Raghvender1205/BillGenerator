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
  onAdd: (rate: ChargeRateInput) => void
  signedIn: boolean
}) {
  return (
    <div className="charge-presets">
      <label>
        Add a calculated charge
        <select
          value=""
          disabled={loading}
          onChange={(event) => {
            const saved = rates.find((rate) => rate.id === event.target.value)
            if (saved) onAdd(saved)
            else if (event.target.value === 'electricity')
              onAdd({ name: 'Electricity', unit: 'kWh', rate: '' })
            else if (event.target.value === 'water')
              onAdd({ name: 'Water', unit: 'units', rate: '' })
            else if (event.target.value === 'custom')
              onAdd({ name: '', unit: 'units', rate: '' })
          }}
        >
          <option value="">
            {loading ? 'Loading your rates…' : 'Choose a charge'}
          </option>
          {rates.length ? (
            <optgroup label="Your saved rates">
              {rates.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.name} · Rs. {rate.rate} / {rate.unit}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label="Enter a rate on this bill">
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
            <option value="custom">Other calculated charge</option>
          </optgroup>
        </select>
      </label>
      <p>
        {signedIn ? (
          <Link href="/settings">Manage default rates in profile settings</Link>
        ) : (
          'Enter units and a rate to calculate the amount.'
        )}
      </p>
      {error ? (
        <>
          <p className="form-error" role="alert">
            {error}
          </p>
          <button type="button" className="text-button" onClick={refresh}>
            Retry loading rates
          </button>
        </>
      ) : null}
    </div>
  )
}
