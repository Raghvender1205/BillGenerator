import { Layers2 } from 'lucide-react'
import {
  amountValue,
  displayDate,
  money,
  totals,
  type Invoice,
} from '../lib/invoice'

export default function InvoicePaper({ invoice }: { invoice: Invoice }) {
  const { subtotal, discount, total } = totals(invoice.items)
  return (
    <article className="invoice-paper" aria-label="Invoice preview">
      <div className="paper-top">
        <div className="paper-brand">
          <Layers2 size={21} aria-hidden="true" /> rentflow.
        </div>
        <span>RENT INVOICE</span>
      </div>
      <div className="paper-title">
        <h3>
          Invoice<span>.</span>
        </h3>
        <span>{invoice.number || 'INV-YYYYMM-001'}</span>
      </div>
      <div className="paper-dates">
        <div>
          <small>DUE DATE</small>
          <strong>{displayDate(invoice.due)}</strong>
        </div>
      </div>
      <div className="paper-parties">
        <div>
          <small>FROM</small>
          <strong>{invoice.landlord.name || 'Your name'}</strong>
          <p>{invoice.landlord.phone || 'Your phone number'}</p>
        </div>
        <div>
          <small>BILL TO</small>
          <strong>{invoice.tenant.name || 'Tenant name'}</strong>
          <p>{invoice.tenant.address || 'Property address'}</p>
          <p>{invoice.tenant.contact}</p>
        </div>
      </div>
      <div className="paper-items">
        <div className="paper-table-head">
          <span>DESCRIPTION</span>
          <span>AMOUNT</span>
        </div>
        {invoice.items.length ? (
          invoice.items.map((item) => (
            <div
              className={`paper-item ${item.type === 'discount' ? 'discount-item' : ''}`}
              key={item.id}
            >
              <span>
                {item.title ||
                  (item.type === 'discount' ? 'Discount' : 'Untitled charge')}
                {item.type === 'discount' ? <small>Discount</small> : null}
              </span>
              <strong>
                {item.type === 'discount' ? '−' : ''}
                {money(amountValue(item.amount))}
              </strong>
            </div>
          ))
        ) : (
          <p className="paper-empty">Your charges will appear here.</p>
        )}
      </div>
      <div className="paper-totals">
        <div>
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        {discount > 0 ? (
          <div>
            <span>Discounts</span>
            <span>−{money(discount)}</span>
          </div>
        ) : null}
      </div>
      <div className="paper-total">
        <span>
          Total due <small>INR</small>
        </span>
        <strong>{money(total)}</strong>
      </div>
      <div className="paper-footer">
        <span>Created with RentFlow</span>
        <span>Simple. Clear. Professional.</span>
      </div>
    </article>
  )
}
