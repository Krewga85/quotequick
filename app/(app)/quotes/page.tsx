'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getQuotes, updateQuoteStatus, deleteQuote, getBusinessDetails, createInvoiceFromQuote } from '@/lib/data'
import { Quote } from '@/lib/types'
import { generateQuotePDF } from '@/lib/generate-pdf'
import { Download, Check, X, Trash2, Search, X as ClearIcon, FileText } from 'lucide-react'
import { exportQuotesToCSV } from '@/lib/export'
import { EmptyState } from '@/components/empty-state'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function MyQuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all')
  const [convertingId, setConvertingId] = useState<string | null>(null)

  // New search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  useEffect(() => {
    loadQuotes()
  }, [])

  async function loadQuotes() {
    setLoading(true)
    try {
      const data = await getQuotes()
      setQuotes(data)
    } catch (e) {
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  // Advanced filtered + searched quotes
  const filteredQuotes = useMemo(() => {
    let result = [...quotes]

    // Status filter
    if (filter !== 'all') {
      result = result.filter(q => q.status === filter)
    }

    // Text search (customer name, quote number, line item descriptions)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      result = result.filter(q => {
        const customerMatch = q.customer?.name?.toLowerCase().includes(term)
        const numberMatch = q.quote_number.toLowerCase().includes(term)
        const descriptionMatch = q.line_items?.some(item =>
          item.description.toLowerCase().includes(term)
        )
        return customerMatch || numberMatch || descriptionMatch
      })
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = parseISO(dateFrom)
      result = result.filter(q => {
        const qDate = parseISO(q.date)
        return qDate >= fromDate
      })
    }
    if (dateTo) {
      const toDate = parseISO(dateTo)
      result = result.filter(q => {
        const qDate = parseISO(q.date)
        return qDate <= toDate
      })
    }

    // Customer filter
    if (selectedCustomerId) {
      result = result.filter(q => q.customer_id === selectedCustomerId)
    }

    return result
  }, [quotes, filter, searchTerm, dateFrom, dateTo, selectedCustomerId])

  async function handleStatusChange(quoteId: string, newStatus: 'accepted' | 'declined') {
    try {
      await updateQuoteStatus(quoteId, newStatus)
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q))
      toast.success(`Quote marked as ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleDelete(quoteId: string) {
    if (!confirm('Delete this quote permanently?')) return
    try {
      await deleteQuote(quoteId)
      setQuotes(prev => prev.filter(q => q.id !== quoteId))
      toast.success('Quote deleted')
    } catch {
      toast.error('Failed to delete quote')
    }
  }

  async function handleConvertToInvoice(quote: Quote) {
    setConvertingId(quote.id)
    try {
      const invoice = await createInvoiceFromQuote(quote.id)
      toast.success(`Invoice ${invoice.invoice_number} created from quote`)
      router.push(`/invoices/${invoice.id}`)
    } catch (e: any) {
      if (e.message === 'FREE_LIMIT_REACHED') {
        toast.error('Free plan limit reached (20 invoices/month).', {
          description: 'Upgrade to Pro for unlimited invoices.',
          action: {
            label: 'Upgrade',
            onClick: () => router.push('/pricing'),
          },
        })
      } else {
        toast.error(e.message || 'Failed to convert to invoice')
      }
    } finally {
      setConvertingId(null)
    }
  }

  async function handleDownload(quote: Quote) {
    const customer = quote.customer || null
    let businessDetails
    try {
      businessDetails = await getBusinessDetails()
    } catch {
      businessDetails = { name: 'Your Company Name', vat_rate: 20, plan: 'free' as const }
    }
    generateQuotePDF(quote, customer, businessDetails)
    toast.success('PDF downloaded')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">My Quotes</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => exportQuotesToCSV(quotes)}
            disabled={quotes.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild>
            <Link href="/quotes/new">New Quote</Link>
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'accepted', 'declined'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${
              filter === f 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Advanced Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
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

          {/* Date From */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Customer Filter */}
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
                  quotes
                    .filter(q => q.customer)
                    .map(q => [q.customer!.id, q.customer!])
                ).values()
              ).map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
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
      ) : filteredQuotes.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={quotes.length === 0 ? FileText : Search}
            title={quotes.length === 0 ? "No quotes yet" : "No quotes match your filters"}
            description={
              quotes.length === 0
                ? "Start by creating your first quote. It takes less than a minute."
                : "Try clearing some filters or broadening your search terms."
            }
            hint={
              quotes.length === 0
                ? "Tip: Add a few customers first — it makes quoting on site much faster."
                : undefined
            }
            action={
              quotes.length === 0
                ? { label: 'Create your first quote', href: '/quotes/new' }
                : {
                    label: 'Clear all filters',
                    onClick: () => {
                      setSearchTerm('')
                      setDateFrom('')
                      setDateTo('')
                      setSelectedCustomerId('')
                      setFilter('all')
                    },
                    variant: 'outline',
                  }
            }
          />
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground mb-2">
            Showing {filteredQuotes.length} of {quotes.length} quotes
          </div>
        <div className="card overflow-x-auto table-scroll">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-5 py-3 text-left">Quote #</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-muted/50">
                  <td className="px-5 py-4 font-medium">{quote.quote_number}</td>
                  <td className="px-5 py-4 text-muted-foreground">{quote.customer?.name || '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{format(new Date(quote.date), 'dd MMM yyyy')}</td>
                  <td className="px-5 py-4 text-right font-medium">£{quote.total.toFixed(2)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline px-3 py-px rounded text-xs status-${quote.status}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right pr-6">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleDownload(quote)} className="p-2 hover:bg-muted rounded" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </button>
                      {quote.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatusChange(quote.id, 'accepted')} className="p-2 hover:bg-emerald-950 text-emerald-400 rounded" title="Mark accepted">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleStatusChange(quote.id, 'declined')} className="p-2 hover:bg-red-950 text-red-400 rounded" title="Mark declined">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {quote.status === 'accepted' && (
                        <button 
                          onClick={() => handleConvertToInvoice(quote)} 
                          disabled={convertingId === quote.id}
                          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                          title="Convert to Invoice"
                        >
                          {convertingId === quote.id ? 'Converting...' : 'Convert to Invoice'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(quote.id)} className="p-2 hover:bg-red-950 text-red-400 rounded" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
