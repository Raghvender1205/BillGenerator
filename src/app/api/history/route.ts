import { NextResponse } from 'next/server'
import { currentUser, createClient } from '../../lib/supabase/server'
import { isInvoice, totals, amountValue } from '../../lib/invoice'
import { sameOrigin } from '../../lib/request-origin'
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return reply({ error: 'Invalid request origin.' }, 403)
  const user = await currentUser()
  if (!user) return reply({ error: 'Sign in to save invoice history.' }, 401)
  if (request.headers.get('x-rentflow-user') !== user.id)
    return reply(
      { error: 'The signed-in account changed. Reload before continuing.' },
      409,
    )
  let input
  try {
    const text = await request.text()
    if (text.length > 250_000)
      return reply({ error: 'Invoice is too large.' }, 400)
    input = JSON.parse(text)
  } catch {
    return reply({ error: 'Invalid invoice.' }, 400)
  }
  const invoice: unknown = input?.invoice
  if (
    !isInvoice(invoice) ||
    !invoice.number.trim() ||
    invoice.number.length > 50 ||
    !invoice.landlord.name.trim() ||
    !invoice.tenant.name.trim() ||
    !invoice.tenant.address.trim() ||
    !invoice.items.every((item) => item.title.trim() && item.amount !== '') ||
    !invoice.items.some(
      (item) => item.type === 'regular' && amountValue(item.amount) > 0,
    ) ||
    totals(invoice.items).total < 0
  ) {
    return reply(
      { error: 'Complete your invoice before saving it to history.' },
      400,
    )
  }
  const supabase = await createClient()
  const { error } = await supabase.from('rentflow_invoices').upsert(
    {
      user_id: user.id,
      number: invoice.number,
      invoice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,number' },
  )
  if (error)
    return reply(
      { error: 'Could not save invoice history. Please try again.' },
      503,
    )
  return reply({ saved: true })
}
