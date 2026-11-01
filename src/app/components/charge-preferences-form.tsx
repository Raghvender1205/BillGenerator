'use client'
import { useState } from 'react'
import type { ChargeRate } from '../lib/charge-rates'
import {
  chargePreferenceDrafts,
  chargePreferencePayload,
  validChargePreferences,
} from '../lib/charge-preferences'
import ChargePreferencesEditor from './charge-preferences-editor'

export default function ChargePreferencesForm({
  initialRates,
  save,
}: {
  initialRates: ChargeRate[]
  save: (
    rows: ReturnType<typeof chargePreferencePayload>,
  ) => Promise<ChargeRate[]>
}) {
  const [rows, setRows] = useState(() => chargePreferenceDrafts(initialRates))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        setMessage('')
        const payload = chargePreferencePayload(rows)
        if (!validChargePreferences(payload)) {
          setError(
            'Complete each selected charge with a unique name and a valid amount or rate.',
          )
          return
        }
        setBusy(true)
        try {
          const saved = await save(payload)
          setRows(chargePreferenceDrafts(saved))
          setMessage('Your charges have been saved.')
        } catch (reason) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not save your charges.',
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <ChargePreferencesEditor
        rows={rows}
        onChange={(next) => {
          setRows(next)
          setMessage('')
        }}
        disabled={busy}
      />
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <div className="settings-actions">
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? 'Saving…' : 'Save my charges'}
        </button>
      </div>
      <p className="settings-status" role="status">
        {message}
      </p>
    </form>
  )
}
