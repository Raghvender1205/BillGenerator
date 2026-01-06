'use client'
import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { jsPDF } from 'jspdf'
import {
  User,
  List,
  Plus,
  Percent,
  Building,
  Eye,
  Download,
  Trash2,
  X
} from 'lucide-react'

type BillSection = {
  id: string
  title: string
  amount: number
  type: 'regular' | 'discount'
}

type TenantInfo = {
  name: string
  address: string
  contact: string
}

type LandlordInfo = {
  name: string
  phone: string
}

const STORAGE_KEYS = {
  landlord: 'rentflow_landlord_info',
  tenant: 'rentflow_tenant_info',
}

export default function BillGenerator() {
  // State
  const [sections, setSections] = useState<BillSection[]>([])
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({
    name: '',
    address: '',
    contact: '',
  })
  const [landlordInfo, setLandlordInfo] = useState<LandlordInfo>({
    name: '',
    phone: '',
  })
  const [invoiceId, setInvoiceId] = useState<string>('')
  const [dateStr, setDateStr] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Hydration & Init - Load from localStorage
  useEffect(() => {
    setInvoiceId(uuidv4().slice(0, 8).toUpperCase())
    setDateStr(new Date().toLocaleDateString())
    setMounted(true)

    // Load saved data from localStorage
    const savedLandlord = localStorage.getItem(STORAGE_KEYS.landlord)
    const savedTenant = localStorage.getItem(STORAGE_KEYS.tenant)

    if (savedLandlord) {
      try {
        setLandlordInfo(JSON.parse(savedLandlord))
      } catch {
        console.error('Failed to parse landlord info from localStorage')
      }
    }

    if (savedTenant) {
      try {
        setTenantInfo(JSON.parse(savedTenant))
      } catch {
        console.error('Failed to parse tenant info from localStorage')
      }
    }
  }, [])

  // Save landlord info to localStorage when it changes
  useEffect(() => {
    if (mounted && (landlordInfo.name || landlordInfo.phone)) {
      localStorage.setItem(STORAGE_KEYS.landlord, JSON.stringify(landlordInfo))
    }
  }, [landlordInfo, mounted])

  // Save tenant info to localStorage when it changes
  useEffect(() => {
    if (mounted && (tenantInfo.name || tenantInfo.address || tenantInfo.contact)) {
      localStorage.setItem(STORAGE_KEYS.tenant, JSON.stringify(tenantInfo))
    }
  }, [tenantInfo, mounted])

  // Handlers
  const addSection = (type: 'regular' | 'discount') => {
    setSections([...sections, { id: uuidv4(), title: '', amount: 0, type }])
  }

  const removeSection = (id: string) => {
    setSections(sections.filter((section) => section.id !== id))
  }

  const updateSection = (id: string, field: keyof BillSection, value: string | number) => {
    setSections(sections.map(section => section.id === id ? { ...section, [field]: value } : section))
  }

  const updateTenantInfo = (field: keyof TenantInfo, value: string) => {
    setTenantInfo({ ...tenantInfo, [field]: value })
  }

  const updateLandlordInfo = (field: keyof LandlordInfo, value: string) => {
    setLandlordInfo({ ...landlordInfo, [field]: value })
  }

  const calculateSubtotal = () => {
    return sections.reduce((total, section) => section.type === 'regular' ? total + section.amount : total, 0)
  }

  const calculateDiscount = () => {
    return sections.reduce((total, section) => section.type === 'discount' ? total + section.amount : total, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount()
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Header Color Block
    doc.setFillColor(31, 41, 55) // Gray-800
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Header Text
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('RENT INVOICE', 20, 25)
    doc.setFontSize(10)
    doc.text(`#INV-${invoiceId}`, 20, 32)

    // Date on right side of header
    doc.text(`Date: ${dateStr}`, pageWidth - 20, 32, { align: 'right' })

    // Reset Color
    doc.setTextColor(0, 0, 0)
    yPosition = 55

    // FROM Section
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('FROM:', 20, yPosition)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(landlordInfo.name || 'Landlord Name', 20, yPosition + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(landlordInfo.phone || '', 20, yPosition + 14)

    // TO Section
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('BILL TO:', pageWidth / 2, yPosition)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(tenantInfo.name || 'Tenant Name', pageWidth / 2, yPosition + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    // Handle multi-line address
    const maxWidth = pageWidth / 2 - 25
    const addressLines = doc.splitTextToSize(tenantInfo.address || 'Address', maxWidth)
    let addressY = yPosition + 14
    addressLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, addressY)
      addressY += 5
    })
    doc.text(tenantInfo.contact || 'Contact', pageWidth / 2, addressY)

    yPosition = Math.max(yPosition + 35, addressY + 10)

    // Table Header
    doc.setFillColor(243, 244, 246) // Gray-100
    doc.rect(20, yPosition - 6, pageWidth - 40, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Description', 25, yPosition)
    doc.text('Amount', pageWidth - 25, yPosition, { align: 'right' })
    yPosition += 12

    // Items
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    sections.forEach((section) => {
      const prefix = section.type === 'discount' ? '-Rs.' : 'Rs.'
      doc.text(section.title || (section.type === 'discount' ? 'Discount' : 'Item'), 25, yPosition)
      doc.text(`${prefix}${section.amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' })
      yPosition += 8
    })

    // Totals
    yPosition += 15
    doc.setLineWidth(0.5)
    doc.line(120, yPosition, pageWidth - 20, yPosition)
    yPosition += 12

    doc.setFontSize(10)
    doc.text('Subtotal:', 145, yPosition, { align: 'right' })
    doc.text(`Rs.${calculateSubtotal().toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' })
    yPosition += 7
    doc.text('Discount:', 145, yPosition, { align: 'right' })
    doc.text(`-Rs.${calculateDiscount().toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' })
    yPosition += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', 145, yPosition, { align: 'right' })
    doc.text(`Rs.${calculateTotal().toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' })

    // Footer
    yPosition = pageHeight - 30
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(128, 128, 128)
    doc.text('Generated by RentFlow', pageWidth / 2, yPosition, { align: 'center' })

    doc.save(`invoice-${invoiceId}.pdf`)
  }

  if (!mounted) return null

  // Colors based on user Design
  // Primary: Indigo-600 (#4F46E5) -> Used standard tailwind indigo-600
  // Secondary: Emerald-500 (#10B981) -> emerald-500
  // Surface: White / Gray-800
  // Background: Gray-100 / Gray-900

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300 font-sans">

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">Invoice Generator</h2>
          <p className="text-gray-600 dark:text-gray-400">Create professional invoices for your tenants in seconds with RentFlow.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Company Information (Paid To) */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="bg-blue-600 px-6 py-4 border-b border-blue-700">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Landlord Information (Paid To)
              </h3>
            </div>
            <div className="p-6 space-y-5 flex-grow">
              <div>
                <label htmlFor="landlordName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Landlord Name</label>
                <input
                  type="text"
                  id="landlordName"
                  className="w-full px-4 py-2 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Enter landlord name"
                  value={landlordInfo.name}
                  onChange={(e) => updateLandlordInfo('name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="landlordPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  id="landlordPhone"
                  className="w-full px-4 py-2 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Enter phone number"
                  value={landlordInfo.phone}
                  onChange={(e) => updateLandlordInfo('phone', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Tenant Information Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="bg-indigo-600 px-6 py-4 border-b border-indigo-700">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant Information (Paid By)
              </h3>
            </div>
            <div className="p-6 space-y-5 flex-grow">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Enter tenant name"
                  value={tenantInfo.name}
                  onChange={(e) => updateTenantInfo('name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  id="address"
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Enter tenant address"
                  value={tenantInfo.address}
                  onChange={(e) => updateTenantInfo('address', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
                <input
                  type="text"
                  id="contact"
                  className="w-full px-4 py-2 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Enter tenant contact"
                  value={tenantInfo.contact}
                  onChange={(e) => updateTenantInfo('contact', e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Bill Sections - Full Width */}
        <div className="mb-8">
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="bg-indigo-600 px-6 py-4 border-b border-indigo-700">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                Bill Sections
              </h3>
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => addSection('regular')}
                  className="flex-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4" /> Add Section
                </button>
                <button
                  onClick={() => addSection('discount')}
                  className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <Percent className="h-4 w-4" /> Add Discount
                </button>
              </div>

              {/* Items List */}
              <div className="flex-grow flex flex-col gap-3">
                {sections.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8">
                    <Plus className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">No items added yet. Click above to start building your invoice.</p>
                  </div>
                ) : (
                  sections.map(section => (
                    <div key={section.id} className="flex gap-3 items-center group">
                      <input
                        type="text"
                        placeholder="Description"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        className="flex-grow px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="relative">
                        <span className={cn("absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold",
                          section.type === 'discount' ? "text-red-500" : "text-green-500"
                        )}>
                          {section.type === 'discount' ? '-' : '₹'}
                        </span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={section.amount || ''}
                          onChange={(e) => updateSection(section.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-24 pl-5 pr-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-right text-sm font-mono focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        onClick={() => removeSection(section.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-6">
            <h3 className="text-slate-900 dark:text-white font-bold text-xl mb-2">Ready to Generate?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Preview your invoice or export it directly to PDF</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowPreview(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-white dark:bg-gray-700 border-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-3 shadow-sm"
            >
              <Eye className="h-5 w-5" />
              Show Preview
            </button>
            <button
              onClick={exportToPDF}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="h-5 w-5" />
              Export to PDF
            </button>
          </div>
        </section>

        {/* Invoice Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
            <div
              className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-gray-100 dark:bg-gray-900 rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-slate-900 dark:text-white font-bold text-xl">Invoice Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 rounded-md h-9 px-4 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Invoice Paper */}
              <div className="p-6 md:p-8">
                <div className="bg-white text-slate-900 shadow-md rounded-sm p-8 md:p-12 relative overflow-hidden">
                  {/* Decorative gradient corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50/50 to-transparent pointer-events-none"></div>

                  {/* Invoice Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start mb-12">
                    <div className="flex flex-col gap-1 mb-4 md:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-8 w-8 text-blue-600" />
                        <span className="text-xl font-bold text-slate-900 tracking-tight">{landlordInfo.name || 'Landlord Name'}</span>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight mb-2">Rent Invoice</h2>
                      <div className="flex flex-col gap-1">
                        <p className="text-slate-500 text-sm">Date Issued: <span className="font-semibold text-slate-900">{dateStr}</span></p>
                        <p className="text-slate-500 text-sm">Invoice #: <span className="font-semibold text-slate-900">INV-{invoiceId}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Three Column Info Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 border-t border-b border-gray-100 py-8">
                    {/* Paid To */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1">
                        <span className="text-sm">💳</span> Paid To
                      </h3>
                      <div className="text-slate-900">
                        <p className="font-bold text-base mb-1">{landlordInfo.name || 'Landlord Name'}</p>
                        <p className="text-sm text-slate-600">{landlordInfo.phone || 'Phone Number'}</p>
                      </div>
                    </div>

                    {/* Paid By */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1">
                        <User className="h-4 w-4" /> Paid By
                      </h3>
                      <div className="text-slate-900">
                        <p className={cn("font-bold text-base mb-1", !tenantInfo.name && "text-slate-400 italic")}>
                          {tenantInfo.name || 'Tenant Name'}
                        </p>
                        <p className={cn("text-sm text-slate-600", !tenantInfo.contact && "text-slate-400 italic")}>
                          {tenantInfo.contact || 'tenant@example.com'}
                        </p>
                      </div>
                    </div>

                    {/* Property Address */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1">
                        <span className="text-sm">🏠</span> Property Address
                      </h3>
                      <div className="text-slate-900">
                        <p className={cn("font-medium text-base mb-1", !tenantInfo.address && "text-slate-400 italic")}>
                          {tenantInfo.address || 'Property Address'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-10">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-900">
                          <th className="py-3 pr-4 text-sm font-bold text-slate-900 uppercase tracking-wide">Description</th>
                          <th className="py-3 pl-4 text-sm font-bold text-slate-900 uppercase tracking-wide text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {sections.length === 0 ? (
                          <tr>
                            <td className="py-4 pr-4">
                              <p className="font-semibold text-slate-400 text-base italic">No items added yet</p>
                              <p className="text-slate-400 text-sm mt-0.5">Add sections above to build your invoice</p>
                            </td>
                            <td className="py-4 pl-4 text-right font-semibold text-slate-400 text-base">₹0.00</td>
                          </tr>
                        ) : (
                          sections.map((section) => (
                            <tr key={section.id}>
                              <td className="py-4 pr-4">
                                <p className="font-semibold text-slate-900 text-base">
                                  {section.title || (section.type === 'discount' ? 'Discount' : 'Item')}
                                </p>
                                <p className="text-slate-500 text-sm mt-0.5">
                                  {section.type === 'discount' ? 'Discount applied' : 'Charge for services'}
                                </p>
                              </td>
                              <td className={cn(
                                "py-4 pl-4 text-right font-semibold text-base",
                                section.type === 'discount' ? "text-red-500" : "text-slate-900"
                              )}>
                                {section.type === 'discount' ? '-' : ''}₹{section.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="flex flex-col items-end pt-4 border-t border-slate-100">
                    <div className="w-full md:w-5/12 space-y-3">
                      <div className="flex justify-between text-base text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-900">₹{calculateSubtotal().toFixed(2)}</span>
                      </div>
                      {calculateDiscount() > 0 && (
                        <div className="flex justify-between text-base text-emerald-600">
                          <span>Discount</span>
                          <span className="font-semibold">-₹{calculateDiscount().toFixed(2)}</span>
                        </div>
                      )}
                      <div className="h-px bg-slate-200 my-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-xl">Total</span>
                        <span className="font-bold text-3xl text-blue-600 tracking-tight">₹{calculateTotal().toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Amount in Indian Rupees</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}