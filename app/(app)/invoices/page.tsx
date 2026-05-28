'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getInvoices, updateInvoiceStatus, getCurrentPlan, getMonthlyInvoiceCount } from '@/lib/data'
import { Invoice } from '@/lib/types'
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf'
import { Download, Check, FileText, Search, X as ClearIcon } from 'lucide-react'
import { exportInvoicesToCSV } from '@/lib/export'
import { EmptyState } from '@/components/empty-state'
import { toast } from 'sonner'
import { format, isPast, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getBusinessDetails } from '@/lib/data'

type Tab = 'all' | 'pending' | 'paid' | 'overdue'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'premium'>('free')
  const [monthlyCount, setMonthlyCount] = useState(0)

  // Advanced filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    setLoading(true)
    try {
      const [data, plan, count] = await Promise.all([
        getInvoices(),
        getCurrentPlan(),
        getMonthlyInvoiceCount(),
      ])
      setInvoices(data)
      setCurrentPlan(plan)
      setMonthlyCount(count)
    } catch (e) {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  // Derive overdue status
  const getDisplayStatus = (inv: Invoice): 'pending' | 'paid' | 'overdue' => {
    if (inv.status === 'paid') return 'paid'
    const due = parseISO(inv.due_date)
    if (inv.status === 'pending' && isPast(due)) return 'overdue'
    return 'pending'
  }

  // Advanced filtered invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices]

    // Status filter (using derived status)
    if (activeTab !== 'all') {
      result = result.filter(inv => getDisplayStatus(inv) === activeTab)
    }

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      result = result.filter(inv => {
        const customerMatch = inv.customer?.name?.toLowerCase().includes(term)
        const numberMatch = inv.invoice_number.toLowerCase().includes(term)
        const descriptionMatch = inv.quote?.line_items?.some(item =>
          item.description.toLowerCase().includes(term)
        )
        return customerMatch || numberMatch || descriptionMatch
      })
    }

    // Date range
    if (dateFrom) {
      const fromDate = parseISO(dateFrom)
      result = result.filter(inv => parseISO(inv.date) >= fromDate)
    }
    if (dateTo) {
      const toDate = parseISO(dateTo)
      result = result.filter(inv => parseISO(inv.date) <= toDate)
    }

    // Customer filter
    if (selectedCustomerId) {
      result = result.filter(inv => inv.customer_id === selectedCustomerId)
    }

    return result
  }, [invoices, activeTab, searchTerm, dateFrom, dateTo, selectedCustomerId, getDisplayStatus])

  async function handleMarkPaid(invoiceId: string) {
    try {
      await updateInvoiceStatus(invoiceId, 'paid')
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
      ))
      toast.success('Invoice marked as paid')
    } catch {
      toast.error('Failed to update invoice')
    }
  }

  async function handleDownload(inv: Invoice) {
    let businessDetails
    try {
      businessDetails = await getBusinessDetails()
    } catch {
      businessDetails = { name: 'Your Company Name', vat_rate: 20, plan: 'free' as const }
    }

    // Support both quote-linked and standalone invoices
    if (inv.quote) {
      generateInvoicePDF(inv.quote, inv.customer || null, businessDetails)
    } else {
      // Standalone invoice — pass the invoice data directly (generator supports InvoiceData shape)
      generateInvoicePDF(inv as any, inv.customer || null, businessDetails)
    }
    toast.success('Invoice PDF downloaded')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'paid', label: 'Paid' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Create standalone invoices or convert from accepted quotes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => exportInvoicesToCSV(invoices)}
            disabled={invoices.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild>
            <Link href="/invoices/new">New Invoice</Link>
          </Button>
        </div>
      </div>

      {currentPlan === 'free' && (
        <div className="mb-6 p-3 rounded-lg bg-muted border border-border flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">Free Plan:</span> {monthlyCount} / 20 invoices used this month
          </div>
          {monthlyCount >= 18 && (
            <Button size="sm" variant="default" asChild>
              <a href="/pricing">Upgrade to Pro</a>
            </Button>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${
              activeTab === tab.key 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Advanced Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Customer, number, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Customers</option>
              {Array.from(
                new Map(
                  invoices
                    .filter(i => i.customer)
                    .map(i => [i.customer!.id, i.customer!])
                ).values()
              ).map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchTerm || dateFrom || dateTo || selectedCustomerId) && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setDateFrom('')
                setDateTo('')
                setSelectedCustomerId('')
              }}
            >
              <ClearIcon className="h-4 w-4 mr-1" /> Clear all filters
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-10">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-2/3 mt-6"></div>
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={invoices.length === 0 ? FileText : Search}
            title={invoices.length === 0 ? "No invoices yet" : "No invoices match your filters"}
            description={
              invoices.length === 0
                ? "Convert an accepted quote to an invoice, or create a standalone one directly."
                : "Adjust your filters or search terms to see more results."
            }
            hint={
              invoices.length === 0
                ? "Pro move: Accept a quote then convert it in one click from the My Quotes page."
                : undefined
            }
            action={
              invoices.length === 0
                ? { label: 'Go to My Quotes', href: '/quotes', variant: 'default' }
                : {
                    label: 'Clear all filters',
                    onClick: () => {
                      setSearchTerm('')
                      setDateFrom('')
                      setDateTo('')
                      setSelectedCustomerId('')
                    },
                    variant: 'outline',
                  }
            }
            secondaryAction={
              invoices.length === 0
                ? { label: 'New Invoice', href: '/invoices/new', variant: 'outline' }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="card overflow-x-auto table-scroll">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-5 py-3 text-left">Invoice #</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Due</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvoices.map((inv) => {
                const displayStatus = getDisplayStatus(inv)
                return (
                  <tr key={inv.id} className="hover:bg-muted/50">
                    <td className="px-5 py-4 font-medium">{inv.invoice_number}</td>
                    <td className="px-5 py-4 text-muted-foreground">{inv.customer?.name || '—'}</td>
                    <td className="px-5 py-4 text-muted-foreground">{format(new Date(inv.date), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-4 text-muted-foreground">{format(new Date(inv.due_date), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-4 text-right font-medium">£{inv.total.toFixed(2)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline px-3 py-px rounded text-xs status-${displayStatus}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDownload(inv)} 
                          className="p-2 hover:bg-muted rounded" 
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <Link 
                          href={`/invoices/${inv.id}`} 
                          className="px-3 py-1.5 hover:bg-muted rounded text-sm text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
                        >
                          View
                        </Link>
                        {displayStatus === 'pending' && (
                          <button 
                            onClick={() => handleMarkPaid(inv.id)} 
                            className="p-2 hover:bg-emerald-950 text-emerald-400 rounded" 
                            title="Mark as paid"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
