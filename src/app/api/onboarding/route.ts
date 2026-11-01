import { NextResponse } from 'next/server'
import { currentUser, createClient } from '../../lib/supabase/server'
import { sameOrigin } from '../../lib/request-origin'
import { validLandlord } from '../../lib/landlords'
import { validTenant } from '../../lib/tenants'
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
  const tenant = input?.tenant ?? null
  if (
    typeof input?.skip !== 'boolean' ||
    (!input.skip &&
      (!validChargePreferences(input.charges) ||
        (input.landlord !== null && !validLandlord(input.landlord)) ||
        (tenant !== null && !validTenant(tenant))))
  )
    return reply(
      {
        error:
          'Check the landlord and tenant details and complete each selected charge.',
      },
      400,
    )
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    'rentflow_complete_onboarding_with_tenant',
    {
      p_landlord: input.skip ? null : input.landlord,
      p_tenant: input.skip ? null : tenant,
      p_charges: input.skip ? [] : input.charges,
      p_skip: input.skip,
    },
  )
  if (error)
    return reply(
      {
        error:
          'We could not save your setup. Your entries are still here; please try again.',
      },
      503,
    )
  const completed = data as {
    landlord_id: string | null
    tenant_id: string | null
  }
  const [landlords, tenants] = await Promise.all([
    completed.landlord_id
      ? supabase
          .from('rentflow_landlords')
          .select('id, name, phone')
          .eq('user_id', user.id)
          .order('name')
      : null,
    completed.tenant_id
      ? supabase
          .from('rentflow_tenants')
          .select('id, name, contact, address')
          .eq('user_id', user.id)
          .order('name')
      : null,
  ])
  return reply({
    complete: true,
    selected: completed.landlord_id,
    landlords: landlords?.data,
    selectedTenant: completed.tenant_id,
    tenants: tenants?.data,
  })
}
