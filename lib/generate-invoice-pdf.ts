import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Quote, Customer, BusinessDetails, InvoiceLineItem } from './types'
import { format, addDays } from 'date-fns'

interface InvoiceData {
  invoice_number?: string
  date: string
  due_date?: string
  line_items: InvoiceLineItem[]
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  notes?: string | null
}

export function generateInvoicePDF(
  data: Quote | InvoiceData,
  customer: Customer | null,
  business: BusinessDetails = { name: 'Your Business Name', vat_rate: 20, plan: 'free' as const }
) {
  const isQuote = 'quote_number' in data
  const lineItems = isQuote ? (data as Quote).line_items : (data as InvoiceData).line_items
  const invoiceDate = isQuote ? (data as Quote).date : (data as InvoiceData).date
  const invoiceNumber = isQuote 
    ? (data as Quote).quote_number.replace('Q-', 'INV-') 
    : (data as InvoiceData).invoice_number || 'INV-XXXX'
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  const dueDate = (data as InvoiceData).due_date 
    ? format(new Date((data as InvoiceData).due_date!), 'dd MMM yyyy')
    : format(addDays(new Date(invoiceDate), 14), 'dd MMM yyyy')

  // Dark header
  doc.setFillColor(15, 15, 18)
  doc.rect(0, 0, pageWidth, 42, 'F')

  let textStartX = margin
  if (business.logo) {
    try {
      doc.addImage(business.logo, 'PNG', margin, 6, 28, 28)
      textStartX = margin + 34
    } catch {}
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(business.name || 'Your Business', textStartX, 18)

  doc.setFontSize(8)
  const contactParts: string[] = []
  if (business.phone) contactParts.push(business.phone)
  if (business.email) contactParts.push(business.email)
  if (contactParts.length) doc.text(contactParts.join('  •  '), textStartX, 26)

  doc.setFontSize(11)
  doc.text('INVOICE', pageWidth - margin, 18, { align: 'right' })

  // Invoice meta
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(`Invoice #${invoiceNumber}`, margin, 52)
  doc.text(`Due: ${dueDate}`, pageWidth - margin, 52, { align: 'right' })

  // From / To
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('FROM:', margin, 62)
  doc.text('TO:', pageWidth - margin - 60, 62)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(business.name || '', margin, 68)
  if (business.address) {
    business.address.split('\n').slice(0, 2).forEach((line, i) => {
      doc.text(line, margin, 73 + i * 4)
    })
  }

  if (customer) {
    doc.text(customer.name, pageWidth - margin, 68, { align: 'right' })
    if (customer.address) {
      customer.address.split('\n').slice(0, 2).forEach((line, i) => {
        doc.text(line, pageWidth - margin, 73 + i * 4, { align: 'right' })
      })
    }
  }

  // Line items
  const tableData = lineItems.map(item => [
    item.type.toUpperCase(),
    item.description,
    item.quantity.toString(),
    `£${item.unit_price.toFixed(2)}`,
    `£${(item.quantity * item.unit_price).toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: 95,
    head: [['TYPE', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 85 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
  })

  const finalY = ((doc as any).lastAutoTable?.finalY ?? 150) + 12

  const rightX = pageWidth - margin
  doc.setFontSize(10)
  const subtotal = isQuote ? (data as Quote).subtotal : (data as InvoiceData).subtotal
  const vatRate = isQuote ? (data as Quote).vat_rate : (data as InvoiceData).vat_rate
  const vatAmount = isQuote ? (data as Quote).vat_amount : (data as InvoiceData).vat_amount
  const total = isQuote ? (data as Quote).total : (data as InvoiceData).total

  doc.text('Subtotal', rightX - 50, finalY)
  doc.text(`£${subtotal.toFixed(2)}`, rightX, finalY, { align: 'right' })

  doc.text(`VAT (${vatRate}%)`, rightX - 50, finalY + 7)
  doc.text(`£${vatAmount.toFixed(2)}`, rightX, finalY + 7, { align: 'right' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL DUE', rightX - 50, finalY + 16)
  doc.text(`£${total.toFixed(2)}`, rightX, finalY + 16, { align: 'right' })

  // Payment details section
  let payY = finalY + 35
  if (business.bank_account_name || business.bank_sort_code || business.bank_account_number) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT DETAILS', margin, payY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (business.bank_account_name) doc.text(business.bank_account_name, margin, payY + 7)
    if (business.bank_sort_code && business.bank_account_number) {
      doc.text(`Sort Code: ${business.bank_sort_code}   Account Number: ${business.bank_account_number}`, margin, payY + 12)
    }
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Thank you for your business.', pageWidth / 2, 285, { align: 'center' })

  doc.save(`Invoice-${invoiceNumber}.pdf`)
}
