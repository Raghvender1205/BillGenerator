import Link from 'next/link'
import { currentUser, createClient } from '../lib/supabase/server'
import { isInvoice } from '../lib/invoice'
import InvoiceHistory from '@/components/invoice-history'
export default async function History({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const user = await currentUser()
  if (!user)
    return (
      <div className="workspace history-page">
        <h1>Invoice history</h1>
        <p>
          Sign in to save copies of your invoices and access them across
          devices.
        </p>
        <div className="history-guest-actions">
          <Link className="primary-button" href="/login">
            Sign in
          </Link>
          <Link className="text-button" href="/auth/sign-up">
            Create an account
          </Link>
          <Link className="text-button" href="/">
            Continue generating bills without an account
          </Link>
        </div>
      </div>
    )
  const requested = Number((await searchParams).page || 1)
  const page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 10000
      ? requested
      : 1
  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('rentflow_invoices')
    .select('id, invoice, updated_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * 20, page * 20 - 1)
  const invoices = (data || []).flatMap((record) =>
    isInvoice(record.invoice)
      ? [{ id: record.id, invoice: record.invoice, savedAt: record.updated_at }]
      : [],
  )
  return (
    <div className="workspace history-page">
      <div className="history-heading">
        <div>
          <h1>Invoice history</h1>
          <p>Your downloaded invoices, saved to your account.</p>
        </div>
        <Link className="text-button" href="/">
          Back to invoice builder
        </Link>
      </div>
      {error ? (
        <p role="alert" className="form-error">
          We couldn’t load your history. <Link href="/history">Try again</Link>.
        </p>
      ) : (
        <InvoiceHistory records={invoices} />
      )}
      <nav className="history-pagination" aria-label="Invoice history pages">
        {page > 1 ? (
          <Link href={`/history?page=${page - 1}`}>Previous page</Link>
        ) : null}
        <span>Page {page}</span>
        {page * 20 < (count || 0) ? (
          <Link href={`/history?page=${page + 1}`}>Next page</Link>
        ) : null}
      </nav>
    </div>
  )
}
