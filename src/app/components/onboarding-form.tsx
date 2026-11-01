'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Check } from 'lucide-react'
import ChargePreferencesEditor from './charge-preferences-editor'
import {
  chargePreferenceDrafts,
  chargePreferencePayload,
  validChargePreferences,
} from '../lib/charge-preferences'
import type { ChargeRate } from '../lib/charge-rates'
import { validLandlord } from '../lib/landlords'
import { clearChargeRateCache } from '../lib/use-charge-rates'
import { clearLandlordCache, writeLandlordCache } from '../lib/landlord-cache'

export default function OnboardingForm({
  userId,
  initialRates,
}: {
  userId: string
  initialRates: ChargeRate[]
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [landlord, setLandlord] = useState({ name: '', phone: '' })
  const [rows, setRows] = useState(() => chargePreferenceDrafts(initialRates))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function finish(skip: boolean) {
    setError('')
    const hasLandlord = Boolean(landlord.name.trim() || landlord.phone.trim())
    const charges = chargePreferencePayload(rows)
    if (
      !skip &&
      ((hasLandlord && !validLandlord(landlord)) ||
        !validChargePreferences(charges))
    ) {
      setError('Check your landlord details and complete each selected charge.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RentFlow-User': userId,
        },
        body: JSON.stringify({
          skip,
          landlord: hasLandlord ? landlord : null,
          charges,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw Error(data.error || 'Could not finish setup.')
      clearChargeRateCache()
      clearLandlordCache()
      if (data.landlords && data.selected)
        writeLandlordCache(userId, {
          profiles: data.landlords,
          selected: data.selected,
          cachedAt: Date.now(),
        })
      router.replace('/')
      router.refresh()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not finish setup.',
      )
      setBusy(false)
    }
  }
  return (
    <div className="onboarding-shell">
      <div className="onboarding-top">
        <span className="eyebrow">WELCOME TO RENTFLOW</span>
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={() => void finish(true)}
        >
          Skip for now
        </button>
      </div>
      <ol className="onboarding-steps" aria-label="Setup progress">
        <li aria-current={step === 1 ? 'step' : undefined}>
          <span>{step > 1 ? <Check size={14} aria-hidden="true" /> : '1'}</span>
          Landlord
        </li>
        <li aria-current={step === 2 ? 'step' : undefined}>
          <span>2</span>Your charges
        </li>
      </ol>
      <h1>
        {step === 1
          ? 'Make your first bill feel familiar.'
          : 'What do you usually charge for?'}
      </h1>
      <p className="onboarding-description">
        {step === 1
          ? 'Add a landlord now, or leave this blank. You can manage landlords in Settings anytime.'
          : 'Choose only what you use and set your defaults. Skipped charges stay out of your bill builder.'}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 1) {
            setError('')
            setStep(2)
          } else void finish(false)
        }}
      >
        {step === 1 ? (
          <fieldset disabled={busy} className="onboarding-landlord">
            <span className="auth-symbol">
              <Building2 size={23} aria-hidden="true" />
            </span>
            <label>
              Landlord name <span>(optional)</span>
              <input
                required={Boolean(landlord.phone.trim())}
                maxLength={100}
                autoComplete="name"
                value={landlord.name}
                onChange={(event) =>
                  setLandlord({ ...landlord, name: event.target.value })
                }
                placeholder="e.g. Alex Morgan"
              />
            </label>
            <label>
              Phone number <span>(optional)</span>
              <input
                type="tel"
                maxLength={40}
                autoComplete="tel"
                value={landlord.phone}
                onChange={(event) =>
                  setLandlord({ ...landlord, phone: event.target.value })
                }
                placeholder="e.g. +91 98765 43210"
              />
            </label>
          </fieldset>
        ) : (
          <ChargePreferencesEditor
            rows={rows}
            onChange={setRows}
            disabled={busy}
          />
        )}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="onboarding-actions">
          {step === 2 ? (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setStep(1)
                setError('')
              }}
            >
              Back
            </button>
          ) : (
            <span>Optional setup · ready in a minute</span>
          )}
          <button type="submit" className="primary-button" disabled={busy}>
            {busy
              ? 'Saving…'
              : step === 1
                ? 'Continue to charges'
                : 'Start creating bills'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}
