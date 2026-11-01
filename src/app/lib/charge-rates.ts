export type ChargeRateInput = {
  name: string
  unit: string
  rate: string
  mode?: 'per_unit' | 'fixed'
  enabled?: boolean
}
export type ChargeRate = ChargeRateInput & {
  id: string
  mode: 'per_unit' | 'fixed'
  enabled: boolean
}

export function validDecimal(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 20 &&
    /^(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(value) &&
    Number(value) <= 1000000
  )
}

export function validChargeRate(value: unknown): value is ChargeRateInput {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.name === 'string' &&
    row.name.trim().length > 0 &&
    row.name.length <= 100 &&
    typeof row.unit === 'string' &&
    row.unit.trim().length > 0 &&
    row.unit.length <= 24 &&
    validDecimal(row.rate) &&
    (row.mode === undefined ||
      row.mode === 'per_unit' ||
      row.mode === 'fixed') &&
    (row.enabled === undefined || typeof row.enabled === 'boolean')
  )
}

// Four decimal places for inputs, rounded once to paise after multiplication.
export function calculatedAmount(quantity: string, rate: string): string {
  if (!validDecimal(quantity) || !validDecimal(rate)) return ''
  function scaled(value: string) {
    const [whole, fraction = ''] = value.split('.')
    return (
      BigInt(whole || '0') * BigInt(10000) + BigInt(fraction.padEnd(4, '0'))
    )
  }
  const cents =
    (scaled(quantity) * scaled(rate) + BigInt(500000)) / BigInt(1000000)
  if (cents > BigInt(100000000000)) return ''
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, '0')}`
}
