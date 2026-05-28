'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getQuotes } from '@/lib/data'
import { Quote } from '@/lib/types'
import { Plus, FileText, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const data = await getQuotes()
      setQuotes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const pending = quotes.filter(q => q.status === 'pending')
  const acceptedThisMonth = quotes.filter(q => {
    const d = new Date(q.created_at)
    const now = new Date()
    return q.status === 'accepted' && 
           d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear()
  })

  const totalPendingValue = pending.reduce((sum, q) => sum + q.total, 0)
  const acceptanceRate = quotes.length > 0 
    ? Math.round((quotes.filter(q => q.status === 'accepted').length / quotes.length) * 100) 
    : 0

  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your quotes.</p>
        </div>
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="text-xs text-muted-foreground tracking-widest mb-1">PENDING VALUE</div>
          <div className="text-3xl font-semibold tracking-tighter">£{totalPendingValue.toFixed(0)}</div>
          <div className="text-sm text-muted-foreground mt-1">{pending.length} quotes awaiting response</div>
        </div>

        <div className="card p-6">
          <div className="text-xs text-muted-foreground tracking-widest mb-1">ACCEPTED THIS MONTH</div>
          <div className="text-3xl font-semibold tracking-tighter">{acceptedThisMonth.length}</div>
          <div className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            £{acceptedThisMonth.reduce((s, q) => s + q.total, 0).toFixed(0)} won
          </div>
        </div>

        <div className="card p-6">
          <div className="text-xs text-muted-foreground tracking-widest mb-1">TOTAL QUOTES</div>
          <div className="text-3xl font-semibold tracking-tighter">{quotes.length}</div>
          <div className="text-sm text-muted-foreground mt-1">All time</div>
        </div>

        <div className="card p-6">
          <div className="text-xs text-muted-foreground tracking-widest mb-1">ACCEPTANCE RATE</div>
          <div className="text-3xl font-semibold tracking-tighter">
            {acceptanceRate}<span className="text-xl font-normal">%</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Of sent quotes</div>
        </div>
      </div>

      {/* Recent Quotes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Recent Quotes</h2>
        <Link href="/quotes" className="text-sm text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="card p-10">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      ) : recentQuotes.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Create your first professional quote in under a minute. Fast, clean, and ready to send."
            hint="Most tradespeople send their first quote the same day they sign up."
            action={{
              label: 'Create your first quote',
              href: '/quotes/new',
            }}
          />
        </div>
      ) : (
        <div className="card overflow-x-auto table-scroll">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Quote #</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-muted/50">
                  <td className="px-5 py-3.5 font-medium">{quote.quote_number}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{quote.customer?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{format(new Date(quote.date), 'dd MMM yyyy')}</td>
                  <td className="px-5 py-3.5 text-right font-medium">£{quote.total.toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs status-${quote.status}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/quotes/${quote.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
