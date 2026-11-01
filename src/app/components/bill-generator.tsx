'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  Calculator,
  Check,
  CircleHelp,
  Eye,
  FileText,
  LoaderCircle,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  lineAmount,
  isInvoice,
  emptyInvoice,
  money,
  totals,
  type Invoice,
  type LineItem,
} from '../lib/invoice'
import { createInvoiceStore, saveInvoiceHistory } from '../lib/cloud-invoice'
import { createGuestInvoiceStore, readGuestDraft } from '../lib/guest-invoice'
import InvoicePaper from './invoice-paper'
import Link from 'next/link'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'
import SortableInvoiceRow from './sortable-invoice-row'
import SavedLandlords from './saved-landlords'
import ChargePresets from './charge-presets'
import ChargeCalculation from './charge-calculation'
import { useChargeRates } from '../lib/use-charge-rates'
import { calculatedAmount, type ChargeRateInput } from '../lib/charge-rates'
import { landlordCacheLifetime, readLandlordCache } from '../lib/landlord-cache'

function SectionHeading({
  number,
  title,
  hint,
  children,
}: {
  number: string
  title: string
  hint: string
  children?: ReactNode
}) {
  return (
    <div className="section-heading">
      <span className="section-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      {children}
    </div>
  )
}

export default function BillGenerator({ userId }: { userId?: string }) {
  const chargeRates = useChargeRates(userId)
  const [store] = useState(() =>
    userId ? createInvoiceStore(userId) : createGuestInvoiceStore(),
  )
  const [browserDraft, setBrowserDraft] = useState<Invoice | null>(null)
  const [reorderMessage, setReorderMessage] = useState('')
  const savedMessage = userId
    ? 'All changes saved to your account'
    : 'Draft saved in this browser'
  const latest = useRef<Invoice | null>(null)
  const [loadError, setLoadError] = useState('')
  const [invoice, setInvoice] = useState<Invoice>(emptyInvoice)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState('Loading your draft…')
  const [saveFailed, setSaveFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const { subtotal, discount, total } = totals(invoice.items)

  const initialization = useRef<Promise<Invoice> | null>(null)
  useEffect(() => {
    // Reuse initialization during Strict Mode effect replay so the counter is
    // allocated once. Restoring a saved draft never consumes a new number.
    initialization.current ??= store.restore()
    let active = true
    void initialization.current
      .then((draft) => {
        if (!active) return
        if (userId && !draft.landlord.name && !draft.landlord.phone) {
          const cache = readLandlordCache(userId)
          const selected =
            cache && Date.now() - cache.cachedAt < landlordCacheLifetime
              ? cache.profiles.find((profile) => profile.id === cache.selected)
              : null
          if (selected)
            draft = {
              ...draft,
              landlord: { name: selected.name, phone: selected.phone },
            }
        }
        latest.current = draft
        setInvoice(draft)
        if (userId) {
          const local = readGuestDraft()
          if (
            local &&
            (Object.values(local.landlord).some(Boolean) ||
              Object.values(local.tenant).some(Boolean) ||
              local.items.some(
                (item) => item.amount !== '' || item.title !== 'Monthly rent',
              ))
          )
            setBrowserDraft(local)
        }
        setReady(true)
      })
      .catch(() => {
        if (active)
          setLoadError(
            'We could not load your saved invoice. Please reload to try again.',
          )
      })
    return () => {
      active = false
    }
  }, [store, userId])

  useEffect(() => {
    // Flush guest data on navigation and tab close without copying account data
    // into the guest store. Cloud and guest drafts remain independent.
    if (userId) return
    const flush = () => {
      if (latest.current) void store.save(latest.current).catch(() => undefined)
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [store, userId])

  useEffect(() => {
    if (!ready) return
    let active = true
    const timer = window.setTimeout(() => {
      void store
        .save(invoice)
        .then(() => {
          if (active) {
            setSaved(savedMessage)
            setSaveFailed(false)
          }
        })
        .catch((error: Error) => {
          if (active) {
            setSaved(
              error.message || 'Not synced. Keep this tab open and try again.',
            )
            setSaveFailed(true)
          }
        })
    }, 500)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [invoice, ready, store, savedMessage])

  function update(next: Invoice) {
    latest.current = next
    setInvoice(next)
    setSaved('Saving draft…')
    setError('')
  }
  function addItem(type: LineItem['type']) {
    update({
      ...invoice,
      items: [
        ...invoice.items,
        {
          id: crypto.randomUUID(),
          title: type === 'discount' ? 'Discount' : '',
          amount: '',
          type,
        },
      ],
    })
    requestAnimationFrame(() =>
      document.getElementById(`item-${invoice.items.length}`)?.focus(),
    )
  }
  function updateItem(id: string, patch: Partial<LineItem>) {
    update({
      ...invoice,
      items: invoice.items.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        if (next.quantity !== undefined)
          next.amount = calculatedAmount(next.quantity, next.rate || '')
        return next
      }),
    })
  }
  function addCalculatedCharge(preset: ChargeRateInput) {
    const id = crypto.randomUUID()
    update({
      ...invoice,
      items: [
        ...invoice.items,
        {
          id,
          title: preset.name,
          amount: '',
          type: 'regular',
          quantity: '',
          rate: preset.rate,
          unit: preset.unit,
        },
      ],
    })
    requestAnimationFrame(() =>
      document.getElementById(`quantity-${id}`)?.focus(),
    )
  }
  function editCalculation(item: LineItem) {
    if (item.quantity === undefined) {
      const preset = chargeRates.rates.find(
        (rate) => rate.name.toLowerCase() === item.title.trim().toLowerCase(),
      )
      updateItem(item.id, {
        quantity: '',
        rate: preset?.rate || '',
        unit:
          preset?.unit ||
          (item.title.toLowerCase() === 'electricity' ? 'kWh' : 'units'),
      })
    }
    requestAnimationFrame(() =>
      document.getElementById(`quantity-${item.id}`)?.focus(),
    )
  }
  function reorderItem(from: number, to: number) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= invoice.items.length ||
      to >= invoice.items.length
    )
      return
    const items = [...invoice.items]
    const [item] = items.splice(from, 1)
    items.splice(to, 0, item)
    update({ ...invoice, items })
    setReorderMessage(
      `${item.title || 'Item'} moved to position ${to + 1} of ${items.length}.`,
    )
  }
  async function download() {
    if (!form.current?.reportValidity()) return
    if (!isInvoice(invoice)) {
      setError(
        'Check the quantities and rates. Calculated charges must be at most ₹1,000,000,000.',
      )
      document.getElementById('charges')?.focus()
      return
    }
    if (
      !invoice.items.some(
        (item) => item.type === 'regular' && lineAmount(item) > 0,
      )
    ) {
      setError('Add at least one charge greater than zero.')
      document.getElementById('charges')?.focus()
      return
    }
    if (total < 0) {
      setError('Discounts cannot exceed the subtotal.')
      document.getElementById('charges')?.focus()
      return
    }
    setBusy(true)
    setError('')
    try {
      const { exportInvoice } = await import('../lib/export-invoice')
      await exportInvoice(invoice)
      if (userId) {
        try {
          await saveInvoiceHistory(userId, invoice)
        } catch {
          setError(
            'Your PDF was downloaded, but the invoice could not be saved to history. Download it again to retry.',
          )
          document.getElementById('charges')?.focus()
        }
      }
    } catch {
      setError(
        'The PDF could not be created. Please try again. Your draft is still here.',
      )
      document.getElementById('charges')?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="builder-layout">
      <div className="editor-column" id="invoice-editor">
        {loadError ? (
          <div className="load-error" role="alert">
            <p>{loadError}</p>
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Reload invoice
            </button>
          </div>
        ) : null}
        {userId && browserDraft ? (
          <div className="import-draft">
            <span>A previous draft is saved in this browser.</span>
            <button
              className="text-button"
              type="button"
              disabled={!ready}
              onClick={() => {
                if (
                  !window.confirm(
                    'Import the browser draft’s details and charges into your account? Your account invoice number will be kept.',
                  )
                )
                  return
                update({ ...browserDraft, number: invoice.number })
                setBrowserDraft(null)
              }}
            >
              Import browser draft
            </button>
          </div>
        ) : null}
        <div className="editor-top">
          <div>
            <FileText size={18} aria-hidden="true" />
            <h2>New rent invoice</h2>
            <span className="draft-badge">DRAFT</span>
          </div>
          <button
            className="text-button"
            type="button"
            disabled={!ready}
            onClick={async () => {
              if (
                !window.confirm(
                  'Start a new invoice? Current charges will be cleared. Landlord and tenant details will be kept.',
                )
              )
                return
              setReady(false)
              try {
                update({
                  ...(await store.create()),
                  landlord: invoice.landlord,
                  tenant: invoice.tenant,
                })
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Could not start a new invoice. Try again.',
                )
              } finally {
                setReady(true)
              }
            }}
          >
            <RotateCcw size={14} aria-hidden="true" /> Start fresh
          </button>
        </div>
        <form
          ref={form}
          id="invoice-form"
          onSubmit={(event) => {
            event.preventDefault()
            void download()
          }}
        >
          <fieldset disabled={!ready}>
            <section className="editor-section">
              <SectionHeading
                number="01"
                title="The essentials"
                hint="A few details to make it official."
              />
              <div className="field-grid invoice-meta">
                <label>
                  Invoice number
                  <input
                    required
                    maxLength={50}
                    value={invoice.number}
                    onChange={(e) =>
                      update({ ...invoice, number: e.target.value })
                    }
                    placeholder="INV-YYYYMM-001"
                  />
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    required
                    value={invoice.due}
                    onChange={(e) =>
                      update({ ...invoice, due: e.target.value })
                    }
                  />
                </label>
              </div>
            </section>
            <section className="editor-section">
              <SectionHeading
                number="02"
                title="Who's it for?"
                hint="The people behind the place."
              />
              <div className="party-grid">
                <div className="party-block">
                  <h3>
                    <Building2 size={15} aria-hidden="true" /> FROM · LANDLORD
                  </h3>
                  {userId ? (
                    <SavedLandlords
                      key={userId}
                      userId={userId}
                      landlord={invoice.landlord}
                      onSelect={(landlord) => update({ ...invoice, landlord })}
                    />
                  ) : null}
                  <label>
                    Full name <span>*</span>
                    <input
                      autoComplete="section-landlord name"
                      required
                      maxLength={100}
                      placeholder="e.g. Alex Morgan"
                      value={invoice.landlord.name}
                      onChange={(e) =>
                        update({
                          ...invoice,
                          landlord: {
                            ...invoice.landlord,
                            name: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      type="tel"
                      autoComplete="section-landlord tel"
                      maxLength={40}
                      placeholder="e.g. +91 98765 43210"
                      value={invoice.landlord.phone}
                      onChange={(e) =>
                        update({
                          ...invoice,
                          landlord: {
                            ...invoice.landlord,
                            phone: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <div className="party-block">
                  <h3>
                    <UserRound size={15} aria-hidden="true" /> BILL TO · TENANT
                  </h3>
                  <label>
                    Full name <span>*</span>
                    <input
                      autoComplete="section-tenant name"
                      required
                      maxLength={100}
                      placeholder="e.g. Jamie Parker"
                      value={invoice.tenant.name}
                      onChange={(e) =>
                        update({
                          ...invoice,
                          tenant: { ...invoice.tenant, name: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Phone or email
                    <input
                      autoComplete="section-tenant email"
                      maxLength={150}
                      placeholder="How to reach your tenant"
                      value={invoice.tenant.contact}
                      onChange={(e) =>
                        update({
                          ...invoice,
                          tenant: {
                            ...invoice.tenant,
                            contact: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <label className="address-field">
                Rental property address <span>*</span>
                <input
                  required
                  autoComplete="street-address"
                  maxLength={300}
                  placeholder="Flat / house number, street, city, postal code"
                  value={invoice.tenant.address}
                  onChange={(e) =>
                    update({
                      ...invoice,
                      tenant: { ...invoice.tenant, address: e.target.value },
                    })
                  }
                />
              </label>
            </section>
            <section
              className="editor-section"
              id="charges"
              tabIndex={-1}
              aria-describedby={error ? 'invoice-error' : undefined}
            >
              <SectionHeading
                number="03"
                title="Charges & discounts"
                hint="Drag the grip to reorder charges and discounts."
              >
                <span className="currency-badge">INR ₹</span>
              </SectionHeading>
              {error ? (
                <div className="form-error" id="invoice-error" role="alert">
                  {error}
                </div>
              ) : null}
              <div className="line-labels">
                <span aria-hidden="true" />
                <span>DESCRIPTION</span>
                <span>AMOUNT (₹)</span>
                <span />
              </div>
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {reorderMessage}
              </div>
              <DragDropProvider
                onDragEnd={(event) => {
                  if (event.canceled) return
                  const { source } = event.operation
                  if (isSortable(source))
                    reorderItem(source.initialIndex, source.index)
                }}
              >
                <div className="line-items">
                  {invoice.items.map((item, index) => (
                    <SortableInvoiceRow
                      item={item}
                      index={index}
                      disabled={!ready || invoice.items.length < 2}
                      key={item.id}
                    >
                      <div
                        className={`description-input ${item.type === 'regular' ? 'calculable-description' : ''}`}
                      >
                        <input
                          id={`item-${index}`}
                          required
                          maxLength={200}
                          aria-label={`${item.type === 'discount' ? 'Discount' : 'Charge'} ${index + 1} description`}
                          placeholder={
                            item.type === 'discount'
                              ? 'Discount description'
                              : 'e.g. Water charges'
                          }
                          value={item.title}
                          onChange={(e) =>
                            updateItem(item.id, { title: e.target.value })
                          }
                        />
                        {item.type === 'regular' ? (
                          <button
                            type="button"
                            className="icon-button line-calculator"
                            aria-label={
                              item.quantity === undefined
                                ? `Calculate ${item.title || 'charge'} by units`
                                : `Edit ${item.title || 'charge'} calculation`
                            }
                            title="Calculate with units and a rate"
                            onClick={() => editCalculation(item)}
                          >
                            <Calculator size={16} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="1000000000"
                        step="0.01"
                        required
                        inputMode="decimal"
                        aria-label={`Amount for ${item.title || `item ${index + 1}`}`}
                        placeholder="0.00"
                        value={item.amount}
                        readOnly={item.quantity !== undefined}
                        onChange={(e) =>
                          updateItem(item.id, { amount: e.target.value })
                        }
                      />
                      <button
                        className="icon-button remove-item"
                        type="button"
                        aria-label={`Remove ${item.title || `item ${index + 1}`}`}
                        onClick={() =>
                          update({
                            ...invoice,
                            items: invoice.items.filter(
                              (row) => row.id !== item.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </SortableInvoiceRow>
                  ))}
                </div>
              </DragDropProvider>
              {invoice.items
                .filter((item) => item.quantity !== undefined)
                .map((item) => (
                  <ChargeCalculation
                    key={item.id}
                    item={item}
                    onChange={(patch) => updateItem(item.id, patch)}
                  />
                ))}
              <div className="add-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => addItem('regular')}
                >
                  <Plus size={15} aria-hidden="true" /> Add a charge
                </button>
                <button
                  type="button"
                  className="text-button muted-button"
                  onClick={() => addItem('discount')}
                >
                  <Plus size={15} aria-hidden="true" /> Add discount
                </button>
              </div>
              <ChargePresets
                rates={chargeRates.rates}
                loading={chargeRates.loading}
                error={chargeRates.error}
                refresh={chargeRates.refresh}
                onAdd={addCalculatedCharge}
                signedIn={Boolean(userId)}
              />
              <div className="editor-totals">
                <div>
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div>
                  <span>Discounts</span>
                  <span>−{money(discount)}</span>
                </div>
                <div className="editor-total">
                  <span>Total amount due</span>
                  <strong>{money(total)}</strong>
                </div>
              </div>
            </section>
          </fieldset>
          <div className="editor-bottom">
            <ShieldCheck size={15} aria-hidden="true" />
            <span role="status">{saved}</span>
            {saveFailed ? (
              <button
                type="button"
                className="text-button"
                onClick={async () => {
                  setSaved('Saving draft…')
                  try {
                    await store.save(invoice)
                    setSaved(savedMessage)
                    setSaveFailed(false)
                  } catch (error) {
                    setSaved(
                      error instanceof Error
                        ? error.message
                        : 'Not synced. Keep this tab open.',
                    )
                  }
                }}
              >
                Retry save
              </button>
            ) : null}
            <span className="local-label">
              {userId ? 'Private to your account' : 'Only on this device'}
            </span>
          </div>
        </form>
      </div>
      <aside className="preview-column" aria-label="Preview and download">
        <div className="preview-heading">
          <h2>
            <span className="live-dot" /> Live preview
          </h2>
          <button
            type="button"
            className="text-button"
            onClick={() => dialog.current?.showModal()}
          >
            <Eye size={15} aria-hidden="true" /> Expand{' '}
            <ArrowUpRight size={13} aria-hidden="true" />
          </button>
        </div>
        <div className="paper-stage">
          <InvoicePaper invoice={invoice} />
        </div>
        <div className="download-panel">
          <div className="download-summary">
            <div>
              <span>READY WHEN YOU ARE</span>
              <h3>A polished invoice. In one click.</h3>
            </div>
            <div className="download-icon">
              <ArrowDownToLine size={22} aria-hidden="true" />
            </div>
          </div>
          <button
            className="primary-button"
            type="submit"
            form="invoice-form"
            disabled={!ready || busy}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <ArrowDownToLine size={17} aria-hidden="true" />
            )}
            {busy ? 'Creating your PDF…' : 'Download invoice'}
            {!busy ? <ArrowUpRight size={17} aria-hidden="true" /> : null}
          </button>
          <p>
            <Check size={13} aria-hidden="true" /> PDF format <span>·</span>{' '}
            Ready to print or share
          </p>
        </div>
        <div className="help-note">
          <CircleHelp size={17} aria-hidden="true" />
          <p>
            {userId ? (
              <>
                <strong>Your draft, wherever you work.</strong> Details are
                saved to your account. Downloaded invoices are added to your
                history.
              </>
            ) : (
              <>
                <strong>No account needed.</strong> Your draft and
                landlord/tenant details are saved in this browser. Clearing
                browser data removes them.
              </>
            )}
          </p>
        </div>
        {!userId ? (
          <div className="optional-account">
            <strong>Want invoice history and access across devices?</strong>
            <p>
              <Link href="/auth/sign-up">Create an account</Link> or{' '}
              <Link href="/login">sign in</Link>. You can keep generating bills
              without one.
            </p>
          </div>
        ) : (
          <Link className="text-button history-link" href="/history">
            View invoice history <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      </aside>
      <dialog
        aria-labelledby="preview-title"
        ref={dialog}
        className="preview-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close()
        }}
      >
        <div className="dialog-toolbar">
          <h2 id="preview-title">Invoice preview</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close preview"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <InvoicePaper invoice={invoice} />
        <button
          type="button"
          className="primary-button"
          disabled={busy || !ready}
          onClick={() => {
            dialog.current?.close()
            void download()
          }}
        >
          <ArrowDownToLine size={17} aria-hidden="true" /> Download invoice
        </button>
      </dialog>
    </div>
  )
}
