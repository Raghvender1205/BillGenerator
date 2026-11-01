'use client'
import { calculationLabel, type LineItem } from '../lib/invoice'

export default function ChargeCalculation({
  item,
  onChange,
}: {
  item: LineItem
  onChange: (patch: Partial<LineItem>) => void
}) {
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
