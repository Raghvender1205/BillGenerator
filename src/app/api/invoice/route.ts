import { NextResponse } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { isInvoice } from '../../lib/invoice'
import { authConfigured } from '../../lib/supabase/config'
import { sameOrigin } from '../../lib/request-origin'

const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
async function account() {
  if (!authConfigured()) return { supabase: null, user: null }
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { supabase, user: error ? null : user }
}
async function body(request: Request) {
  const text = await request.text()
  if (text.length > 250_000) throw new Error('Invoice too large')
  return JSON.parse(text)
}
export async function GET(request: Request) {
  const { supabase, user } = await account()
  if (!user || !supabase)
    return reply({ error: 'Sign in to access your invoice.' }, 401)
  if (request.headers.get('x-rentflow-user') !== user.id)
    return reply(
      { error: 'The signed-in account changed. Reload before continuing.' },
      409,
    )
  const { data, error } = await supabase
    .from('rentflow_drafts')
    .select('invoice, revision')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error)
    return reply(
      { error: 'We could not load your saved invoice. Please try again.' },
      503,
    )
  return reply(data)
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return reply({ error: 'Invalid request origin.' }, 403)
  const { supabase, user } = await account()
  if (!user || !supabase)
    return reply({ error: 'Sign in to create an invoice.' }, 401)
  if (request.headers.get('x-rentflow-user') !== user.id)
    return reply(
      { error: 'The signed-in account changed. Reload before continuing.' },
      409,
    )
  let input
  try {
    input = await body(request)
  } catch {
    return reply({ error: 'Invalid invoice details.' }, 400)
  }
  if (
    typeof input?.due !== 'string' ||
    !/^\d{4}-\d{2}-01$/.test(input.due) ||
    Number.isNaN(Date.parse(input.due))
  )
    return reply({ error: 'Choose a valid billing month.' }, 400)
  const { data, error } = await supabase
    .rpc('rentflow_new_invoice', { p_due: input.due })
    .select('invoice, revision')
    .single()
  if (error)
    return reply(
      { error: 'We could not create your invoice. Please try again.' },
      503,
    )
  return reply(data)
}
export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return reply({ error: 'Invalid request origin.' }, 403)
  const { supabase, user } = await account()
  if (!user || !supabase)
    return reply(
      { error: 'Your session expired. Sign in again before saving.' },
      401,
    )
  if (request.headers.get('x-rentflow-user') !== user.id)
    return reply(
      { error: 'The signed-in account changed. Reload before continuing.' },
      409,
    )
  let input
  try {
    input = await body(request)
  } catch {
    return reply({ error: 'Invalid invoice details.' }, 400)
  }
  if (
    !isInvoice(input?.invoice) ||
    !Number.isSafeInteger(input?.revision) ||
    input.revision < 1
  )
    return reply({ error: 'Invalid invoice details.' }, 400)
  const { data, error } = await supabase
    .from('rentflow_drafts')
    .update({
      invoice: input.invoice,
      revision: input.revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('revision', input.revision)
    .select('revision')
    .maybeSingle()
  if (error)
    return reply(
      {
        error:
          'Your changes have not synced. Keep this tab open and try again.',
      },
      503,
    )
  if (!data)
    return reply(
      {
        error:
          'This invoice changed in another tab or device. Download your current copy before reloading.',
      },
      409,
    )
  return reply(data)
}
