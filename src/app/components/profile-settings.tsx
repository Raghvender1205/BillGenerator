'use client'
import { useState } from 'react'
import SavedLandlords from './saved-landlords'
import { useChargeRates } from '../lib/use-charge-rates'
import type { ChargeRate, ChargeRateInput } from '../lib/charge-rates'

const emptyRate: ChargeRateInput = { name: '', unit: 'units', rate: '' }
export default function ProfileSettings({ userId }: { userId: string }) {
  const [landlord, setLandlord] = useState({ name: '', phone: '' })
  const { rates, loading, error, refresh, save } = useChargeRates(userId)
  const [details, setDetails] = useState(emptyRate)
  const [editing, setEditing] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  async function remove(row: ChargeRate) {
    if (
      !window.confirm(
        `Remove the saved rate for ${row.name}? Existing bills will keep their rates.`,
      )
    )
      return
    setBusy(true)
    setSaveError('')
    setMessage('')
    try {
      await save('DELETE', { id: row.id })
      if (editing === row.id) {
        setEditing('')
        setDetails(emptyRate)
      }
      setMessage('Charge rate removed.')
    } catch (reason) {
      setSaveError(
        reason instanceof Error ? reason.message : 'Could not remove rate.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="settings-grid">
      <section className="settings-card" aria-labelledby="landlords-title">
        <h2 id="landlords-title">Saved landlords</h2>
        <p>Add a landlord here, then choose them when creating a bill.</p>
        <SavedLandlords
          userId={userId}
          landlord={landlord}
          onSelect={setLandlord}
          rememberSelection={false}
        />
        <label>
          Landlord name
          <input
            maxLength={100}
            value={landlord.name}
            onChange={(e) => setLandlord({ ...landlord, name: e.target.value })}
            placeholder="e.g. Alex Morgan"
          />
        </label>
        <label>
          Landlord phone
          <input
            type="tel"
            maxLength={40}
            value={landlord.phone}
            onChange={(e) =>
              setLandlord({ ...landlord, phone: e.target.value })
            }
            placeholder="e.g. +91 98765 43210"
          />
        </label>
      </section>
      <section className="settings-card" aria-labelledby="rates-title">
        <h2 id="rates-title">Charge rates</h2>
        <p>
          Save a per-unit rate for electricity, water, or any other charge.
          Changes apply to new charges; existing bills keep their original
          rates.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            setSaveError('')
            setMessage('')
            try {
              await save(editing ? 'PATCH' : 'POST', {
                ...details,
                id: editing || undefined,
              })
              setDetails(emptyRate)
              setEditing('')
              setMessage('Charge rate saved.')
            } catch (reason) {
              setSaveError(
                reason instanceof Error
                  ? reason.message
                  : 'Could not save rate.',
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          <fieldset disabled={loading || busy}>
            <label>
              Charge name
              <input
                required
                maxLength={100}
                value={details.name}
                onChange={(e) =>
                  setDetails({ ...details, name: e.target.value })
                }
                placeholder="e.g. Electricity"
              />
            </label>
            <div className="settings-rate-fields">
              <label>
                Unit label
                <input
                  required
                  maxLength={24}
                  value={details.unit}
                  onChange={(e) =>
                    setDetails({ ...details, unit: e.target.value })
                  }
                  placeholder="e.g. kWh"
                />
              </label>
              <label>
                Rate per unit (INR)
                <input
                  required
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.0001"
                  inputMode="decimal"
                  value={details.rate}
                  onChange={(e) =>
                    setDetails({ ...details, rate: e.target.value })
                  }
                  placeholder="e.g. 8.50"
                />
              </label>
            </div>
            <div className="settings-actions">
              <button type="submit" className="primary-button">
                {busy
                  ? 'Saving…'
                  : editing
                    ? 'Update charge rate'
                    : 'Save charge rate'}
              </button>
              {editing ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEditing('')
                    setDetails(emptyRate)
                  }}
                >
                  Cancel editing
                </button>
              ) : null}
            </div>
          </fieldset>
        </form>
        {error || saveError ? (
          <p className="form-error" role="alert">
            {saveError || error}
          </p>
        ) : null}
        <p className="settings-status" role="status">
          {message}
        </p>
        <ul className="saved-rate-list" aria-label="Saved charge rates">
          {rates.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <span>
                  Rs. {row.rate} / {row.unit}
                </span>
              </div>
              <div className="settings-actions">
                <button
                  type="button"
                  className="text-button"
                  disabled={loading || busy}
                  aria-label={`Edit ${row.name} rate`}
                  onClick={() => {
                    setEditing(row.id)
                    setDetails({
                      name: row.name,
                      unit: row.unit,
                      rate: row.rate,
                    })
                    setMessage('')
                    setSaveError('')
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={loading || busy}
                  aria-label={`Remove ${row.name} rate`}
                  onClick={() => void remove(row)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        {!loading && !rates.length ? (
          <p>No rates saved yet. Try Electricity at your rate per kWh.</p>
        ) : null}
        <button
          type="button"
          className="text-button"
          disabled={loading || busy}
          onClick={refresh}
        >
          {loading ? 'Loading rates…' : 'Refresh charge rates'}
        </button>
      </section>
    </div>
  )
}
