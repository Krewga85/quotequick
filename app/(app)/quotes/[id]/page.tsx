'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getQuotes, updateQuoteStatus, getBusinessDetails, createInvoiceFromQuote } from '@/lib/data'
import { Quote } from '@/lib/types'
import { generateQuotePDF } from '@/lib/generate-pdf'
import { Download, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const all = await getQuotes()
        const found = all.find(q => q.id === params.id)
        if (found) setQuote(found)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) return <div className="p-8">Loading quote...</div>
  if (!quote) return <div className="p-8">Quote not found. <Link href="/quotes">Back</Link></div>

  const customer = quote.customer

  async function download() {
    if (!quote) return
    let businessDetails
    try {
      businessDetails = await getBusinessDetails()
    } catch {
      businessDetails = { name: 'Your Company Name', vat_rate: 20, plan: 'free' as const }
    }
    generateQuotePDF(quote, customer || null, businessDetails)
  }

  async function mark(status: 'accepted' | 'declined') {
    if (!quote) return
    await updateQuoteStatus(quote.id, status)
    setQuote({ ...quote, status })
    toast.success(`Marked as ${status}`)
  }

  async function convertToInvoice() {
    if (!quote || quote.status !== 'accepted') return
    setConverting(true)
    try {
      const invoice = await createInvoiceFromQuote(quote.id)
      toast.success(`Invoice ${invoice.invoice_number} created`)
      router.push(`/invoices/${invoice.id}`)
    } catch (e: any) {
      if (e.message === 'FREE_LIMIT_REACHED') {
        toast.error('You have reached your free plan limit of 20 invoices this month.', {
          description: 'Upgrade to Pro for unlimited invoices.',
          action: {
            label: 'Upgrade',
            onClick: () => router.push('/pricing'),
          },
        })
      } else {
        toast.error(e.message || 'Failed to convert quote to invoice')
      }
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/quotes" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to quotes
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-sm text-muted-foreground">QUOTE</div>
          <div className="text-3xl font-semibold tracking-tighter">{quote.quote_number}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tracking-tighter">£{quote.total.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{quote.date}</div>
        </div>
      </div>

      <div className="card p-8">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Customer</div>
          <div className="font-semibold text-xl">{customer?.name}</div>
          {customer?.address && <div className="text-sm text-muted-foreground whitespace-pre-line mt-1">{customer.address}</div>}
        </div>

        <table className="w-full mb-8 text-sm">
          <thead>
            <tr className="text-xs border-b text-muted-foreground">
              <th className="text-left py-2">TYPE</th>
              <th className="text-left py-2">DESCRIPTION</th>
              <th className="text-right py-2">QTY</th>
              <th className="text-right py-2">PRICE</th>
              <th className="text-right py-2">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {quote.line_items.map((item, i) => (
              <tr key={i} className="border-b last:border-none">
                <td className="py-3 text-xs uppercase">{item.type}</td>
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">£{item.unit_price.toFixed(2)}</td>
                <td className="py-3 text-right font-medium">£{(item.quantity * item.unit_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end text-sm flex-col items-end mb-6">
          <div>Subtotal: £{quote.subtotal.toFixed(2)}</div>
          <div>VAT ({quote.vat_rate}%): £{quote.vat_amount.toFixed(2)}</div>
          <div className="font-semibold text-lg pt-1">TOTAL: £{quote.total.toFixed(2)}</div>
        </div>

        {quote.notes && <div className="text-sm border-t pt-4 text-muted-foreground">Notes: {quote.notes}</div>}
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={download} className="flex-1 h-11">
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
        {quote.status === 'pending' && (
          <>
            <Button variant="default" className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500" onClick={() => mark('accepted')}>
              Mark as Accepted
            </Button>
            <Button variant="destructive" className="flex-1 h-11" onClick={() => mark('declined')}>
              Mark as Declined
            </Button>
          </>
        )}
        {quote.status === 'accepted' && (
          <Button 
            onClick={convertToInvoice} 
            disabled={converting}
            className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-base"
          >
            {converting ? 'Converting to Invoice...' : 'Convert to Invoice'}
          </Button>
        )}
      </div>
    </div>
  )
}
