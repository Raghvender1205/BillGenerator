import { jsPDF } from 'jspdf'
import { amountValue, displayDate, totals, type Invoice } from './invoice'

// This module (and jsPDF) is loaded only when the user requests a download.
export async function exportInvoice(invoice: Invoice) {
  const doc = new jsPDF()
  const { subtotal, discount, total } = totals(invoice.items)
  const currency = (value: number) =>
    `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  let y = 25
  const bottom = 270
  function room(height: number) {
    if (y + height > bottom) {
      doc.addPage()
      y = 25
    }
  }
  function text(
    value: string,
    size = 10,
    bold = false,
    color: [number, number, number] = [35, 49, 57],
  ) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines: string[] = doc.splitTextToSize(value, 165)
    const lineHeight = size * 0.45
    for (const line of lines) {
      room(lineHeight)
      doc.text(line, 22, y)
      y += lineHeight
    }
    y += 3
  }
  doc.setFillColor(21, 58, 48)
  doc.rect(0, 0, 210, 5, 'F')
  text('rentflow.', 15, true, [21, 93, 72])
  y += 8
  text('RENT INVOICE', 26, true)
  text(invoice.number, 11)
  y += 3
  text(`Due date: ${displayDate(invoice.due)}`, 10)
  y += 5
  text('FROM', 9, true, [91, 107, 112])
  text(invoice.landlord.name, 12, true)
  if (invoice.landlord.phone) text(invoice.landlord.phone)
  y += 4
  text('BILL TO', 9, true, [91, 107, 112])
  text(invoice.tenant.name, 12, true)
  text(invoice.tenant.address)
  if (invoice.tenant.contact) text(invoice.tenant.contact)
  y += 6
  function tableHeader() {
    room(16)
    doc.setFillColor(240, 245, 242)
    doc.rect(22, y - 5, 166, 10, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(55, 72, 64)
    doc.text('DESCRIPTION', 25, y + 1)
    doc.text('AMOUNT (INR)', 185, y + 1, { align: 'right' })
    y += 13
  }
  tableHeader()
  for (const item of invoice.items) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(35, 49, 57)
    const lines: string[] = doc.splitTextToSize(
      `${item.title}${item.type === 'discount' ? ' (discount)' : ''}`,
      100,
    )
    if (y + lines.length * 5 + 5 > bottom) {
      doc.addPage()
      y = 25
      tableHeader()
    }
    const startY = y
    for (const line of lines) {
      doc.text(line, 25, y)
      y += 5
    }
    doc.text(
      `${item.type === 'discount' ? '-' : ''}${currency(amountValue(item.amount))}`,
      185,
      startY,
      { align: 'right' },
    )
    y += 5
  }
  room(48)
  y += 5
  doc.setDrawColor(214, 225, 217)
  doc.line(22, y, 188, y)
  y += 11
  for (const [label, value] of [
    ['Subtotal', currency(subtotal)],
    ['Discounts', `-${currency(discount)}`],
  ]) {
    doc.text(label, 110, y)
    doc.text(value, 185, y, { align: 'right' })
    y += 8
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Total due', 110, y)
  doc.text(currency(total), 185, y, { align: 'right' })
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 115, 107)
    doc.text('Created with RentFlow', 22, 285)
    doc.text(`${page} / ${pages}`, 188, 285, { align: 'right' })
  }
  doc.save(`invoice-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`)
}
