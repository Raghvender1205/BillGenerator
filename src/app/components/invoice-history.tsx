'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDownToLine, Eye, LoaderCircle, X } from 'lucide-react'
import InvoicePaper from './invoice-paper'
import { displayDate, money, totals, type Invoice } from '../lib/invoice'
export default function InvoiceHistory({
  records,
}: {
  records: { id: string; invoice: Invoice; savedAt: string }[]
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  async function download(id: string, invoice: Invoice) {
    setBusy(id)
    setError('')
    try {
      const { exportInvoice } = await import('../lib/export-invoice')
      await exportInvoice(invoice)
    } catch {
      setError('We couldn’t download this invoice. Please try again.')
    } finally {
      setBusy(null)
    }
  }
  if (!records.length)
    return (
      <div className="history-empty">
        <h2>No saved invoices yet</h2>
        <p>Download an invoice while signed in and it will appear here.</p>
        <Link className="text-button" href="/">
          Create an invoice
        </Link>
      </div>
    )
  return (
    <>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="history-list">
        {records.map(({ id, invoice, savedAt }) => (
          <li className="history-record" key={id}>
            <div>
              <h2>{invoice.number}</h2>
              <p>{invoice.tenant.name}</p>
              <small>
                Due {displayDate(invoice.due)} · Saved{' '}
                {new Date(savedAt).toLocaleDateString('en-GB')}
              </small>
            </div>
            <strong className="history-amount">
              {money(totals(invoice.items).total)}
            </strong>
            <div className="history-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSelected(invoice)
                  dialog.current?.showModal()
                }}
                aria-label={`Preview ${invoice.number}`}
              >
                <Eye size={16} aria-hidden="true" /> Preview
              </button>
              <button
                type="button"
                className="text-button"
                disabled={Boolean(busy)}
                onClick={() => void download(id, invoice)}
                aria-label={`Download ${invoice.number}`}
              >
                {busy === id ? (
                  <LoaderCircle className="spin" size={16} aria-hidden="true" />
                ) : (
                  <ArrowDownToLine size={16} aria-hidden="true" />
                )}{' '}
                PDF
              </button>
            </div>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="preview-dialog"
        aria-labelledby="history-preview-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        <div className="dialog-toolbar">
          <h2 id="history-preview-title">Saved invoice</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Close saved invoice preview"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {selected ? <InvoicePaper invoice={selected} /> : null}
      </dialog>
    </>
  )
}
