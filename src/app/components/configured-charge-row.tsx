'use client'

import { useState } from 'react'
import type { LineItem } from '../lib/invoice'

export default function ConfiguredChargeRow({
  item,
  onChange,
}: {
  item: LineItem
  onChange: (patch: Partial<LineItem>) => void
}) {
  const perUnit = item.quantity !== undefined
  const current = perUnit ? item.rate || '' : item.amount
  const changed = current !== item.defaultRate
  const [editing, setEditing] = useState(changed)
  const editorId = perUnit ? `rate-${item.id}` : `amount-${item.id}`
  return (
    <section
      className="configured-charge-row"
      aria-label={`${item.title} charge details`}
    >
      <h3>{item.title}</h3>
      <div
        className={`inline-charge-amount${!perUnit && editing ? ' is-editing' : ''}`}
      >
        <span aria-hidden="true">₹</span>
        <input
          id={`amount-${item.id}`}
          type="number"
          min="0"
          max="1000000000"
          step="0.01"
          inputMode="decimal"
          required
          readOnly={perUnit || !editing}
          aria-label={`Amount for ${item.title}`}
          placeholder="0.00"
          value={item.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
        />
      </div>
      <div className="inline-charge-controls">
        {perUnit ? (
          <>
            <label className="inline-charge-quantity">
              <span className="sr-only">Quantity for {item.title}</span>
              <input
                id={`quantity-${item.id}`}
                type="number"
                min="0"
                max="1000000"
                step="0.0001"
                required
                inputMode="decimal"
                value={item.quantity}
                placeholder="Units"
                onChange={(event) => onChange({ quantity: event.target.value })}
              />
            </label>
            <span className="inline-charge-unit">{item.unit || 'units'} ×</span>
            {editing ? (
              <label className="inline-charge-rate">
                <span className="sr-only">Rate override for {item.title}</span>
                <span aria-hidden="true">₹</span>
                <input
                  id={editorId}
                  aria-label={`Rate override for ${item.title}`}
                  type="number"
                  required
                  min="0"
                  max="1000000"
                  step="0.0001"
                  inputMode="decimal"
                  value={current}
                  onChange={(event) => onChange({ rate: event.target.value })}
                />
              </label>
            ) : (
              <span className="inline-charge-rate-text">₹{item.rate}</span>
            )}
            <span className="inline-charge-unit">/ {item.unit || 'unit'}</span>
          </>
        ) : (
          <span className="inline-charge-unit">Fixed amount</span>
        )}
        {editing ? (
          <>
            {changed ? (
              <span className="inline-charge-note">This bill only</span>
            ) : null}
            <button
              type="button"
              className="text-button inline-charge-action"
              onClick={() => {
                onChange(
                  perUnit
                    ? { rate: item.defaultRate }
                    : { amount: item.defaultRate || '' },
                )
                setEditing(false)
              }}
            >
              Restore saved {perUnit ? 'rate' : 'amount'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-button inline-charge-action"
            onClick={() => {
              setEditing(true)
              requestAnimationFrame(() =>
                document.getElementById(editorId)?.focus(),
              )
            }}
          >
            Change {perUnit ? 'rate' : 'amount'}
          </button>
        )}
      </div>
      {perUnit &&
      item.quantity !== '' &&
      item.rate !== '' &&
      item.amount === '' ? (
        <p className="form-error" role="alert">
          Check the quantity and rate. The charge cannot exceed ₹1,000,000,000.
        </p>
      ) : null}
    </section>
  )
}
