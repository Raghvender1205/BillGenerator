'use client'
import { useState } from 'react'
import {
  calculationLabel,
  lineAmount,
  money,
  type LineItem,
} from '../lib/invoice'

function ConfiguredCharge({
  item,
  onChange,
}: {
  item: LineItem
  onChange: (patch: Partial<LineItem>) => void
}) {
  const perUnit = item.quantity !== undefined
  const current = perUnit ? item.rate || '' : item.amount
  const [overriding, setOverriding] = useState(current !== item.defaultRate)
  return (
    <section
      className="charge-calculation configured-charge"
      aria-label={`${item.title} charge details`}
    >
      <div className="configured-charge-heading">
        <h3>{item.title}</h3>
        <strong>{money(lineAmount(item))}</strong>
      </div>
      {perUnit ? (
        <label>
          {item.unit || 'Units'} used
          <input
            id={`quantity-${item.id}`}
            required
            type="number"
            min="0"
            max="1000000"
            step="0.0001"
            inputMode="decimal"
            aria-label={`Quantity for ${item.title}`}
            value={item.quantity}
            onChange={(event) => onChange({ quantity: event.target.value })}
            placeholder={`Enter ${item.unit || 'units'} used`}
          />
        </label>
      ) : null}
      <p className="configured-rate">
        {perUnit
          ? `Rate: Rs. ${item.rate} per ${item.unit}`
          : `Amount: ${money(lineAmount(item))}`}
        {current !== item.defaultRate ? (
          <span>Bill-only override</span>
        ) : (
          <span>From your settings</span>
        )}
      </p>
      {perUnit ? (
        <p className="calculation-summary">{calculationLabel(item)}</p>
      ) : null}
      {overriding ? (
        <div className="charge-override">
          <label>
            {perUnit ? 'Rate for this bill (₹)' : 'Amount for this bill (₹)'}
            <input
              required
              type="number"
              min="0"
              max="1000000"
              step={perUnit ? '0.0001' : '0.01'}
              inputMode="decimal"
              aria-label={`${perUnit ? 'Rate override' : 'Amount override'} for ${item.title}`}
              value={current}
              onChange={(event) =>
                onChange(
                  perUnit
                    ? { rate: event.target.value }
                    : { amount: event.target.value },
                )
              }
            />
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onChange(
                perUnit
                  ? { rate: item.defaultRate }
                  : { amount: item.defaultRate || '' },
              )
              setOverriding(false)
            }}
          >
            Use saved {perUnit ? 'rate' : 'amount'}
          </button>
          <p>Only this bill changes. Your default stays the same.</p>
        </div>
      ) : (
        <button
          type="button"
          className="text-button"
          onClick={() => setOverriding(true)}
        >
          Override for this bill
        </button>
      )}
      {perUnit &&
      item.quantity !== '' &&
      item.rate !== '' &&
      item.amount === '' ? (
        <p className="form-error" role="alert">
          Check the quantity and rate. The calculated charge must be at most
          ₹1,000,000,000.
        </p>
      ) : null}
    </section>
  )
}

export default function ChargeCalculation({
  item,
  onChange,
}: {
  item: LineItem
  onChange: (patch: Partial<LineItem>) => void
}) {
  if (item.chargeId) return <ConfiguredCharge item={item} onChange={onChange} />
  if (item.type !== 'regular' || item.quantity === undefined) return null
  return (
    <div className="charge-calculation">
      <h3>{item.title || 'Charge'} calculation</h3>
      <div className="quantity-fields">
        <label>
          Quantity
          <input
            id={`quantity-${item.id}`}
            type="number"
            min="0"
            max="1000000"
            step="0.0001"
            required
            inputMode="decimal"
            aria-label={`Quantity for ${item.title || 'charge'}`}
            value={item.quantity}
            onChange={(event) => onChange({ quantity: event.target.value })}
            placeholder="e.g. 120"
          />
        </label>
        <label>
          Rate per unit (₹)
          <input
            type="number"
            min="0"
            max="1000000"
            step="0.0001"
            required
            inputMode="decimal"
            aria-label={`Rate per unit for ${item.title || 'charge'}`}
            value={item.rate || ''}
            onChange={(event) => onChange({ rate: event.target.value })}
            placeholder="e.g. 8.50"
          />
        </label>
        <label>
          Unit
          <input
            required
            maxLength={24}
            aria-label={`Unit for ${item.title || 'charge'}`}
            value={item.unit || ''}
            onChange={(event) => onChange({ unit: event.target.value })}
            placeholder="kWh"
          />
        </label>
      </div>
      <div className="calculation-summary">
        <span>{calculationLabel(item)}</span>
        <button
          type="button"
          className="text-button"
          aria-label={`Use fixed amount for ${item.title || 'charge'}`}
          onClick={() =>
            onChange({ quantity: undefined, rate: undefined, unit: undefined })
          }
        >
          Use fixed amount
        </button>
      </div>
      {item.quantity !== '' && item.rate !== '' && item.amount === '' ? (
        <p className="form-error" role="alert">
          Use non-negative values with up to four decimal places. The charge
          cannot exceed ₹1,000,000,000.
        </p>
      ) : null}
    </div>
  )
}
