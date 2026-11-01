'use client'
import {
  Plus,
  Zap,
  Droplets,
  Building2,
  Car,
  SlidersHorizontal,
} from 'lucide-react'
import type { ChargePreferenceDraft } from '../lib/charge-preferences'

const icons = {
  Electricity: Zap,
  Water: Droplets,
  Maintenance: Building2,
  Parking: Car,
}
export default function ChargePreferencesEditor({
  rows,
  onChange,
  disabled = false,
}: {
  rows: ChargePreferenceDraft[]
  onChange: (rows: ChargePreferenceDraft[]) => void
  disabled?: boolean
}) {
  function update(key: string, patch: Partial<ChargePreferenceDraft>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }
  return (
    <fieldset disabled={disabled} className="charge-preference-editor">
      <div className="charge-choice-list">
        {rows.map((row, index) => {
          const name = row.name || 'Custom charge'
          const Icon =
            icons[row.name as keyof typeof icons] || SlidersHorizontal
          return (
            <section
              key={row.key}
              className={`charge-choice ${row.enabled ? 'is-enabled' : ''}`}
            >
              <label className="charge-choice-toggle">
                <span className="charge-choice-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>
                    {row.enabled
                      ? 'Included in your charge list'
                      : 'Not shown on your bills'}
                  </small>
                </span>
                <input
                  type="checkbox"
                  aria-label={`Include ${name}`}
                  checked={row.enabled}
                  onChange={(event) =>
                    update(row.key, { enabled: event.target.checked })
                  }
                />
              </label>
              {row.enabled ? (
                <div className="charge-choice-fields">
                  {row.custom ? (
                    <label>
                      Charge name
                      <input
                        required
                        maxLength={100}
                        aria-label={`Custom charge name ${index + 1}`}
                        value={row.name}
                        onChange={(event) =>
                          update(row.key, { name: event.target.value })
                        }
                        placeholder="e.g. Cleaning"
                      />
                    </label>
                  ) : null}
                  <label>
                    How do you charge?
                    <select
                      aria-label={`Billing method for ${name}`}
                      value={row.mode}
                      onChange={(event) =>
                        update(row.key, {
                          mode: event.target.value as 'per_unit' | 'fixed',
                          unit:
                            event.target.value === 'fixed'
                              ? 'charge'
                              : row.unit === 'charge'
                                ? 'units'
                                : row.unit,
                        })
                      }
                    >
                      <option value="per_unit">By units used</option>
                      <option value="fixed">A fixed amount</option>
                    </select>
                  </label>
                  <div className="charge-choice-values">
                    {row.mode === 'per_unit' ? (
                      <label>
                        Unit label
                        <input
                          required
                          maxLength={24}
                          aria-label={`${name} unit label`}
                          value={row.unit}
                          onChange={(event) =>
                            update(row.key, { unit: event.target.value })
                          }
                          placeholder="e.g. kWh"
                        />
                      </label>
                    ) : null}
                    <label>
                      {row.mode === 'fixed'
                        ? 'Default amount (₹)'
                        : 'Rate per unit (₹)'}
                      <input
                        required
                        type="number"
                        min="0"
                        max="1000000"
                        step={row.mode === 'fixed' ? '0.01' : '0.0001'}
                        inputMode="decimal"
                        aria-label={`${name} ${row.mode === 'fixed' ? 'default amount' : 'unit rate'}`}
                        value={row.rate}
                        onChange={(event) =>
                          update(row.key, { rate: event.target.value })
                        }
                        placeholder={
                          row.mode === 'fixed' ? 'e.g. 500' : 'e.g. 8.50'
                        }
                      />
                    </label>
                  </div>
                  <p className="charge-choice-help">
                    {row.mode === 'fixed'
                      ? 'This amount will be filled in when you add the charge.'
                      : `On each bill, enter the ${row.unit || 'units'} used. We’ll calculate the amount.`}
                  </p>
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
      <button
        type="button"
        className="text-button"
        disabled={rows.length >= 50}
        onClick={() =>
          onChange([
            ...rows,
            {
              key: crypto.randomUUID(),
              name: '',
              unit: 'units',
              rate: '',
              mode: 'per_unit',
              enabled: true,
              custom: true,
            },
          ])
        }
      >
        <Plus size={16} aria-hidden="true" />
        Add a custom charge
      </button>
    </fieldset>
  )
}
