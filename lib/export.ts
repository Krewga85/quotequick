import { Quote, Invoice } from './types'

// Escape CSV field: wrap in quotes if needed, escape internal quotes
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  // Add BOM for Excel compatibility with UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportQuotesToCSV(quotes: Quote[]) {
  const headers = [
    'Quote #',
    'Date',
    'Customer',
    'Customer Email',
    'Customer Phone',
    'Status',
    'Subtotal',
    'VAT (20%)',
    'Total',
    'Notes',
    'Line Items'
  ]

  const rows = quotes.map(quote => {
    const lineItemsSummary = (quote.line_items || [])
      .map(item => `${item.description} (${item.quantity}x £${item.unit_price.toFixed(2)})`)
      .join('; ')

    return [
      quote.quote_number,
      quote.date,
      quote.customer?.name || '',
      quote.customer?.email || '',
      quote.customer?.phone || '',
      quote.status,
      quote.subtotal,
      quote.vat_amount,
      quote.total,
      quote.notes || '',
      lineItemsSummary
    ]
  })

  const dateStr = new Date().toISOString().split('T')[0]
  downloadCSV(`quotes-export-${dateStr}.csv`, headers, rows)
}

export function exportInvoicesToCSV(invoices: Invoice[]) {
  const headers = [
    'Invoice #',
    'Date',
    'Due Date',
    'Customer',
    'Customer Email',
    'Customer Phone',
    'Status',
    'Subtotal',
    'VAT (20%)',
    'Total',
    'Notes',
    'Line Items',
    'Linked Quote #'
  ]

  const rows = invoices.map(inv => {
    // Support standalone (line_items) or quote-linked
    const items = inv.line_items || inv.quote?.line_items || []
    const lineItemsSummary = items
      .map(item => `${item.description} (${item.quantity}x £${item.unit_price.toFixed(2)})`)
      .join('; ')

    // Derive display status similar to invoices page (overdue is derived, not stored)
    let displayStatus: string = inv.status
    if (inv.status === 'pending') {
      const due = new Date(inv.due_date)
      if (due < new Date()) displayStatus = 'overdue'
    }

    return [
      inv.invoice_number,
      inv.date,
      inv.due_date,
      inv.customer?.name || '',
      inv.customer?.email || '',
      inv.customer?.phone || '',
      displayStatus,
      inv.subtotal,
      inv.vat_amount,
      inv.total,
      inv.notes || '',
      lineItemsSummary,
      inv.quote?.quote_number || ''
    ]
  })

  const dateStr = new Date().toISOString().split('T')[0]
  downloadCSV(`invoices-export-${dateStr}.csv`, headers, rows)
}
