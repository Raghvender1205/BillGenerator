import {
  validChargeRate,
  type ChargeRate,
  type ChargeRateInput,
} from './charge-rates'

export type ChargePreferenceDraft = ChargeRateInput & {
  key: string
  id?: string
  mode: 'per_unit' | 'fixed'
  enabled: boolean
  custom: boolean
  original?: ChargeRate
}
const defaults = [
  { name: 'Electricity', unit: 'kWh', mode: 'per_unit' as const },
  { name: 'Water', unit: 'units', mode: 'per_unit' as const },
  { name: 'Maintenance', unit: 'charge', mode: 'fixed' as const },
  { name: 'Parking', unit: 'charge', mode: 'fixed' as const },
]
export function chargePreferenceDrafts(
  rates: ChargeRate[],
): ChargePreferenceDraft[] {
  const used = new Set<string>()
  const presetRows = defaults.map((preset) => {
    const saved = rates.find(
      (row) => row.name.toLowerCase() === preset.name.toLowerCase(),
    )
    if (saved) used.add(saved.id)
    return saved
      ? { ...saved, key: saved.id, custom: false, original: saved }
      : {
          ...preset,
          key: `preset:${preset.name}`,
          rate: '',
          enabled: false,
          custom: false,
        }
  })
  return [
    ...presetRows,
    ...rates
      .filter((row) => !used.has(row.id))
      .map((row) => ({ ...row, key: row.id, custom: true, original: row })),
  ]
}
export function chargePreferencePayload(rows: ChargePreferenceDraft[]) {
  return rows
    .filter((row) => row.enabled || row.id)
    .map((row) =>
      !row.enabled && row.original ? { ...row.original, enabled: false } : row,
    )
    .map(({ id, name, unit, rate, mode, enabled }) => ({
      id,
      name: name.trim(),
      unit: mode === 'fixed' ? 'charge' : unit.trim(),
      rate,
      mode,
      enabled,
    }))
}
export function validChargePreferences(
  value: unknown,
): value is (ChargeRateInput & { id?: string })[] {
  if (!Array.isArray(value) || value.length > 50) return false
  const names = new Set<string>()
  return value.every((row) => {
    if (!validChargeRate(row)) return false
    const id = (row as { id?: unknown }).id
    if (
      id !== undefined &&
      (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
    )
      return false
    const name = row.name.trim().toLowerCase()
    if (names.has(name)) return false
    names.add(name)
    return true
  })
}
