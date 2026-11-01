import { NextResponse } from 'next/server'
import { currentUser, createClient } from '../../lib/supabase/server'
import { sameOrigin } from '../../lib/request-origin'
import { validLandlord } from '../../lib/landlords'
import { validChargePreferences } from '../../lib/charge-preferences'

export async function POST(request: Request) {
  const reply = (data: unknown, status = 200) =>
    NextResponse.json(data, {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  if (!sameOrigin(request))
    return reply({ error: 'Invalid request origin.' }, 403)
  const user = await currentUser()
  if (!user) return reply({ error: 'Sign in to finish setup.' }, 401)
  if (request.headers.get('x-rentflow-user') !== user.id)
    return reply({ error: 'Your account changed. Reload to continue.' }, 409)
  let input
  try {
    const text = await request.text()
    if (text.length > 30000) throw Error()
    input = JSON.parse(text)
  } catch {
    return reply({ error: 'Invalid setup details.' }, 400)
  }
  if (
    typeof input?.skip !== 'boolean' ||
    (!input.skip &&
      (!validChargePreferences(input.charges) ||
        (input.landlord !== null && !validLandlord(input.landlord))))
  )
    return reply(
      {
        error: 'Check the landlord details and complete each selected charge.',
      },
      400,
    )
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rentflow_complete_onboarding', {
    p_landlord: input.skip ? null : input.landlord,
    p_charges: input.skip ? [] : input.charges,
    p_skip: input.skip,
  })
  if (error)
    return reply(
      {
        error:
          'We could not save your setup. Your entries are still here; please try again.',
      },
      503,
    )
  const landlords = data
    ? await supabase
        .from('rentflow_landlords')
        .select('id, name, phone')
        .eq('user_id', user.id)
        .order('name')
    : null
  return reply({ complete: true, selected: data, landlords: landlords?.data })
}
