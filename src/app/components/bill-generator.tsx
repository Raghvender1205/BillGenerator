'use client'

import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { Plus, Minus, FileDown } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'

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

export default function BillGenerator() {
  const [sections, setSections] = useState<BillSection[]>([])
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({
    name: '',
    address: '',
    contact: '',
  })
  const [discount, setDiscount] = useState(0); // State for discount

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

  const calculateTotal = () => {
    return sections.reduce((total, section) => {
      return section.type === 'regular' ? total + section.amount : total - section.amount
    }, 0)
  }

  const exportToPDF = () => {
    const input = document.getElementById('bill-content')
    if (input) {
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF()
        const imgProps = pdf.getImageProperties(imgData)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save('bill.pdf')
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-indigo-900 mb-10">Bill Generator</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-indigo-600">
              <CardTitle className="text-white">Tenant Information</CardTitle>
            </CardHeader>
            <CardContent className="mt-6">
              <div className="space-y-6">
                {Object.entries(tenantInfo).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={`tenant-${key}`} className="text-sm font-medium text-gray-700 mb-1 block">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Label>
                    <Input
                      id={`tenant-${key}`}
                      value={value}
                      onChange={(e) => updateTenantInfo(key as keyof TenantInfo, e.target.value)}
                      placeholder={`Enter tenant ${key}`}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-indigo-600">
              <CardTitle className="text-white">Bill Sections</CardTitle>
            </CardHeader>
            <CardContent className="mt-6">
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="flex items-center space-x-2 bg-white p-3 rounded-md shadow">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                      placeholder={section.type === 'discount' ? "Discount description" : "Section title"}
                      className="flex-grow"
                    />
                    <Input
                      type="number"
                      value={section.amount}
                      onChange={(e) => updateSection(section.id, 'amount', Number(e.target.value))}
                      placeholder={section.type === 'discount' ? "Discount amount" : "Amount"}
                      className="w-24"
                    />
                    <Button variant="outline" size="icon" onClick={() => removeSection(section.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="space-x-2 mt-6">
                  <Button onClick={() => addSection('regular')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add Section
                  </Button>
                  <Button onClick={() => addSection('discount')} className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add Discount
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-10 shadow-lg hover:shadow-xl transition-shadow duration-300" id="bill-content">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-2xl">Invoice</CardTitle>
          </CardHeader>
          <CardContent className="mt-6 p-8">
            <div className="space-y-8">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Tenant Information</h4>
                {Object.entries(tenantInfo).map(([key, value]) => (
                  <p key={key} className="text-gray-700">
                    <span className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}:</span> {value}
                  </p>
                ))}
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Bill Details</h4>
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sections.map((section) => (
                        <tr key={section.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{section.title}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${section.type === 'discount' ? 'text-red-600' : 'text-gray-900'}`}>
                            {section.type === 'discount' ? '- ' : ''}₹{section.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">₹{calculateTotal().toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="mt-8 text-center">
          <Button onClick={exportToPDF} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center transition-colors duration-300">
            <FileDown className="h-5 w-5 mr-2" /> Export to PDF
          </Button>
        </div>
      </div>
    </div>
  )
}