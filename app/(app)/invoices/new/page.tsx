'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCustomers, createCustomer, createInvoice, getBusinessDetails } from '@/lib/data'
import { Customer, InvoiceLineItem } from '@/lib/types'
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

export default function NewInvoicePage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' })

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', type: 'labour', quantity: 1, unit_price: 0 }
  ])
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (e) {
      toast.error('Could not load customers')
    }
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const vatRate = 20
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  function addLineItem(type: 'labour' | 'materials') {
    const defaultPrice = type === 'labour' ? 45 : 0
    setLineItems([
      ...lineItems,
      {
        description: type === 'labour' ? 'Labour' : '',
        type,
        quantity: 1,
        unit_price: defaultPrice,
      },
    ])
  }

  function updateLineItem(index: number, field: keyof InvoiceLineItem, value: string | number) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  function removeLineItem(index: number) {
    if (lineItems.length === 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  async function handleAddNewCustomer() {
    if (!newCustomer.name.trim()) {
      toast.error('Customer name is required')
      return
    }
    try {
      const created = await createCustomer(newCustomer)
      setCustomers([created, ...customers])
      setSelectedCustomerId(created.id)
      setShowNewCustomer(false)
      setNewCustomer({ name: '', email: '', phone: '', address: '' })
      toast.success('Customer saved')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save customer')
    }
  }

  async function handleSaveInvoice() {
    if (!selectedCustomerId) {
      toast.error('Please select a customer')
      return
    }
    const validItems = lineItems.filter(item => item.description.trim() && item.unit_price > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one line item with a price')
      return
    }

    setSaving(true)
    try {
      const invoice = await createInvoice({
        customer_id: selectedCustomerId,
        date,
        due_date: dueDate,
        line_items: validItems,
        notes: notes || undefined,
      })

      const customer = customers.find(c => c.id === selectedCustomerId) || null

      let businessDetails
      try {
        businessDetails = await getBusinessDetails()
      } catch {
        businessDetails = { name: 'Your Company Name', vat_rate: 20, plan: 'free' as const }
      }

      generateInvoicePDF(
        {
          invoice_number: invoice.invoice_number,
          date,
          due_date: dueDate,
          line_items: validItems,
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total,
          notes,
        },
        customer,
        businessDetails
      )

      toast.success(`Invoice ${invoice.invoice_number} created and PDF downloaded`)
      router.push('/invoices')
    } catch (e: any) {
      if (e.message === 'FREE_LIMIT_REACHED') {
        toast.error('You have reached your free plan limit of 20 invoices this month.')
      } else {
        toast.error(e.message || 'Failed to save invoice')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-28 lg:pb-6">
      <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">New Invoice</h1>
        <p className="text-muted-foreground">Create a standalone invoice for a customer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Customer */}
          <div className="card p-6">
            <Label className="mb-2 block">Customer</Label>
            {!showNewCustomer ? (
              <div className="flex gap-3">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => setShowNewCustomer(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New
                </Button>
              </div>
            ) : (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <Input placeholder="Customer name *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                  <Input placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddNewCustomer} size="sm">Save Customer</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Invoice Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <Label>Line Items</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addLineItem('labour')}>
                  <Plus className="h-4 w-4 mr-1" /> Labour
                </Button>
                <Button variant="outline" size="sm" onClick={() => addLineItem('materials')}>
                  <Plus className="h-4 w-4 mr-1" /> Materials
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-muted/20">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Type</Label>
                      <select
                        value={item.type}
                        onChange={(e) => updateLineItem(index, 'type', e.target.value as any)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="labour">Labour</option>
                        <option value="materials">Materials</option>
                      </select>
                    </div>
                    <div className="md:col-span-5">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="h-10"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Unit Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7 h-10"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      className="text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-6">
            <Label className="mb-2 block">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Payment terms, thank you message, etc."
            />
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="card p-6 sticky top-6">
            <h3 className="font-semibold mb-4">Invoice Summary</h3>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (20%)</span>
                <span>£{vatAmount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-semibold">
                <span>Total Due</span>
                <span>£{total.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              onClick={handleSaveInvoice} 
              disabled={saving || !selectedCustomerId} 
              className="w-full h-12 text-base"
              size="lg"
            >
              {saving ? 'Saving...' : 'Save Invoice & Download PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sticky summary bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-30">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Total (incl. 20% VAT)</span>
          <span className="font-semibold text-lg">£{total.toFixed(2)}</span>
        </div>
        <Button 
          onClick={handleSaveInvoice} 
          disabled={saving || !selectedCustomerId} 
          className="w-full h-12 text-base"
          size="lg"
        >
          {saving ? 'Saving...' : 'Save & Download PDF'}
        </Button>
      </div>
    </div>
  )
}
