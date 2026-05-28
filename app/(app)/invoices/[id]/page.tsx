'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getInvoiceById, updateInvoiceStatus } from '@/lib/data'
import { Invoice } from '@/lib/types'
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf'
import { Download, ArrowLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format, parseISO, isPast } from 'date-fns'
import { getBusinessDetails } from '@/lib/data'

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getInvoiceById(params.id)
        setInvoice(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) return <div className="p-8">Loading invoice...</div>
  if (!invoice) return <div className="p-8">Invoice not found. <Link href="/invoices">Back</Link></div>

  const displayStatus = invoice.status === 'paid' 
    ? 'paid' 
    : (isPast(parseISO(invoice.due_date)) ? 'overdue' : 'pending')

  const customer = invoice.customer
  const quote = invoice.quote

  async function handleMarkPaid() {
    if (!invoice) return
    try {
      await updateInvoiceStatus(invoice.id, 'paid')
      setInvoice({ ...invoice, status: 'paid' })
      toast.success('Invoice marked as paid')
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleDownload() {
    if (!quote) {
      toast.error('Quote data is missing')
      return
    }
    let businessDetails
    try {
      businessDetails = await getBusinessDetails()
    } catch {
      businessDetails = { name: 'Your Company Name', vat_rate: 20, plan: 'free' as const }
    }
    generateInvoicePDF(quote, customer || null, businessDetails)
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-sm text-muted-foreground">INVOICE</div>
          <div className="text-3xl font-semibold tracking-tighter">{invoice.invoice_number}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tracking-tighter">£{invoice.total.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Due: {format(new Date(invoice.due_date), 'dd MMM yyyy')}</div>
        </div>
      </div>

      <div className="card p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Customer</div>
            <div className="font-semibold text-xl">{customer?.name}</div>
            {customer?.address && <div className="text-sm text-muted-foreground whitespace-pre-line mt-1">{customer.address}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Status</div>
            <span className={`inline px-3 py-1 rounded text-sm status-${displayStatus}`}>
              {displayStatus}
            </span>
            {quote && (
              <div className="mt-2 text-xs">
                <Link href={`/quotes/${quote.id}`} className="text-muted-foreground hover:text-foreground underline">
                  View original quote
                </Link>
              </div>
            )}
          </div>
        </div>

        {quote && (
          <>
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
              <div>Subtotal: £{invoice.subtotal.toFixed(2)}</div>
              <div>VAT ({invoice.vat_rate}%): £{invoice.vat_amount.toFixed(2)}</div>
              <div className="font-semibold text-lg pt-1">TOTAL: £{invoice.total.toFixed(2)}</div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleDownload} className="flex-1 h-11">
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
        {displayStatus === 'pending' && (
          <Button onClick={handleMarkPaid} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500">
            <Check className="h-4 w-4 mr-2" /> Mark as Paid
          </Button>
        )}
      </div>
    </div>
  )
}
