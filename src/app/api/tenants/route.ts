import { NextResponse } from 'next/server'
import { createClient, currentUser } from '../../lib/supabase/server'
import { sameOrigin } from '../../lib/request-origin'
import { validTenant } from '../../lib/tenants'

const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })

async function handle(request: Request) {
  if (request.method !== 'GET' && !sameOrigin(request))
    return reply({ error: 'Invalid request origin.' }, 403)
  const user = await currentUser()
  if (!user) return reply({ error: 'Sign in to use saved tenants.' }, 401)
  if (request.headers.get('x-rentflow-user') !== user.id)
    return reply(
      { error: 'Your account changed. Reload before continuing.' },
      409,
    )
  const supabase = await createClient()
  if (request.method === 'GET') {
    const { data, error } = await supabase
      .from('rentflow_tenants')
      .select('id, name, contact, address')
      .eq('user_id', user.id)
      .order('name')
      .order('id')
    return error
      ? reply({ error: 'Could not load saved tenants. Please retry.' }, 503)
      : reply(data)
  }
  let input
  try {
    const text = await request.text()
    if (text.length > 4000) throw new Error('Too large')
    input = JSON.parse(text)
  } catch {
    return reply({ error: 'Invalid tenant details.' }, 400)
  }
  const id = input?.id
  if (
    request.method !== 'POST' &&
    (typeof id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ))
  )
    return reply({ error: 'Choose a saved tenant.' }, 400)
  if (request.method === 'DELETE') {
    const { data, error } = await supabase
      .from('rentflow_tenants')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error)
      return reply(
        { error: 'Could not remove this tenant. Please retry.' },
        503,
      )
    return data
      ? reply({ id: data.id })
      : reply({ error: 'This saved tenant no longer exists.' }, 404)
  }
  if (!validTenant(input))
    return reply(
      {
        error:
          'Enter a tenant name (up to 100 characters) with contact up to 150 characters and address up to 300 characters.',
      },
      400,
    )
  const details = {
    name: input.name.trim(),
    contact: input.contact.trim(),
    address: input.address.trim(),
  }
  const query =
    request.method === 'POST'
      ? supabase
          .from('rentflow_tenants')
          .insert({ ...details, user_id: user.id })
      : supabase
          .from('rentflow_tenants')
          .update(details)
          .eq('user_id', user.id)
          .eq('id', id)
  const { data, error } = await query
    .select('id, name, contact, address')
    .maybeSingle()
  if (error)
    return reply(
      {
        error:
          error.code === '23505'
            ? 'These tenant details are already saved.'
            : 'Could not save this tenant. Please retry.',
      },
      error.code === '23505' ? 409 : 503,
    )
  return data
    ? reply(data)
    : reply({ error: 'This saved tenant no longer exists.' }, 404)
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
