import { NextResponse } from 'next/server'
import { createClient, currentUser } from '../../lib/supabase/server'
import { sameOrigin } from '../../lib/request-origin'
import { validChargeRate } from '../../lib/charge-rates'

const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
async function handle(request: Request) {
  if (request.method !== 'GET' && !sameOrigin(request))
    return reply({ error: 'Invalid request origin.' }, 403)
  const user = await currentUser()
  if (!user) return reply({ error: 'Sign in to manage charge rates.' }, 401)
  if (request.headers.get('x-rentflow-user') !== user.id)
    return reply(
      { error: 'Your account changed. Reload before continuing.' },
      409,
    )
  const supabase = await createClient()
  if (request.method === 'GET') {
    const { data, error } = await supabase
      .from('rentflow_charge_rates')
      .select('id, name, unit, rate')
      .eq('user_id', user.id)
      .order('name')
    return error
      ? reply({ error: 'Could not load charge rates. Please retry.' }, 503)
      : reply(data.map((row) => ({ ...row, rate: String(row.rate) })))
  }
  let input
  try {
    const text = await request.text()
    if (text.length > 2000) throw Error('Too large')
    input = JSON.parse(text)
  } catch {
    return reply({ error: 'Invalid charge rate.' }, 400)
  }
  const id = input?.id
  if (
    request.method !== 'POST' &&
    (typeof id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ))
  )
    return reply({ error: 'Choose a saved rate.' }, 400)
  if (request.method === 'DELETE') {
    const { data, error } = await supabase
      .from('rentflow_charge_rates')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error) return reply({ error: 'Could not remove this rate.' }, 503)
    return data
      ? reply(data)
      : reply({ error: 'This charge rate no longer exists.' }, 404)
  }
  if (!validChargeRate(input))
    return reply(
      {
        error:
          'Enter a charge name, unit label, and a rate from 0 to 1,000,000 with up to four decimal places.',
      },
      400,
    )
  const details = {
    name: input.name.trim(),
    unit: input.unit.trim(),
    rate: Number(input.rate),
  }
  const query =
    request.method === 'POST'
      ? supabase
          .from('rentflow_charge_rates')
          .insert({ ...details, user_id: user.id })
      : supabase
          .from('rentflow_charge_rates')
          .update(details)
          .eq('user_id', user.id)
          .eq('id', id)
  const { data, error } = await query
    .select('id, name, unit, rate')
    .maybeSingle()
  if (error)
    return reply(
      {
        error:
          error.code === '23505'
            ? 'A rate with this name is already saved.'
            : 'Could not save this rate.',
      },
      error.code === '23505' ? 409 : 503,
    )
  return data
    ? reply({ ...data, rate: String(data.rate) })
    : reply({ error: 'This charge rate no longer exists.' }, 404)
}
export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
