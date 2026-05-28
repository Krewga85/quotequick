import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Quote, Customer, BusinessDetails } from './types'
import { format } from 'date-fns'

export function generateQuotePDF(
  quote: Quote,
  customer: Customer | null,
  business: BusinessDetails = { name: 'Your Business Name', vat_rate: 20, plan: 'free' as const }
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let headerHeight = 42

  // Professional dark header
  doc.setFillColor(15, 15, 18)
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  // Logo (if present) - top left
  let textStartX = margin
  if (business.logo) {
    try {
      doc.addImage(business.logo, 'PNG', margin, 6, 28, 28)
      textStartX = margin + 34
    } catch (e) {
      // Logo failed to load, ignore
    }
  }

  // Business name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(business.name || 'Your Business', textStartX, 18)

  // Contact info under name in header (small)
  doc.setFontSize(8)
  const contactParts: string[] = []
  if (business.phone) contactParts.push(business.phone)
  if (business.email) contactParts.push(business.email)
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  •  '), textStartX, 26)
  }

  // "QUOTE" label on right
  doc.setFontSize(11)
  doc.text('QUOTE', pageWidth - margin, 18, { align: 'right' })

  // Quote number and date
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(`Quote #${quote.quote_number}`, margin, 52)
  doc.text(`Date: ${format(new Date(quote.date), 'dd MMM yyyy')}`, pageWidth - margin, 52, { align: 'right' })

  // Business address on right side (sender info)
  let senderY = 60
  if (business.address || business.phone || business.email) {
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text('FROM:', pageWidth - margin, senderY, { align: 'right' })
    doc.setTextColor(40, 40, 40)
    if (business.address) {
      const addrLines = business.address.split('\n').slice(0, 2)
      addrLines.forEach((line, i) => {
        doc.text(line, pageWidth - margin, senderY + 5 + (i * 4), { align: 'right' })
      })
    }
  }

  // Customer section
  let y = 68
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('TO:', margin, y)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(customer?.name || 'Customer', margin, y + 7)

  if (customer?.address) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lines = customer.address.split('\n')
    lines.forEach((line, i) => {
      doc.text(line, margin, y + 14 + (i * 5))
    })
    y += lines.length * 5
  }

  // Line items table
  const tableStartY = Math.max(y + 22, 95)

  const tableData = quote.line_items.map(item => [
    item.type.toUpperCase(),
    item.description,
    item.quantity.toString(),
    `£${item.unit_price.toFixed(2)}`,
    `£${(item.quantity * item.unit_price).toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['TYPE', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [39, 39, 42], // zinc-800
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
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  })

  // Totals
  const finalY = ((doc as any).lastAutoTable?.finalY ?? 120) + 12

  doc.setFontSize(10)
  const rightX = pageWidth - margin

  doc.text('Subtotal', rightX - 50, finalY)
  doc.text(`£${quote.subtotal.toFixed(2)}`, rightX, finalY, { align: 'right' })

  doc.text(`VAT (${quote.vat_rate}%)`, rightX - 50, finalY + 7)
  doc.text(`£${quote.vat_amount.toFixed(2)}`, rightX, finalY + 7, { align: 'right' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', rightX - 50, finalY + 16)
  doc.text(`£${quote.total.toFixed(2)}`, rightX, finalY + 16, { align: 'right' })

  // Notes
  if (quote.notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Notes:', margin, finalY + 30)
    doc.text(quote.notes, margin, finalY + 36)
  }

  // Bank details (useful for payment)
  let bankY = finalY + 48
  if (business.bank_account_name || business.bank_sort_code || business.bank_account_number) {
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text('PAYMENT DETAILS', margin, bankY)
    doc.setTextColor(40, 40, 40)
    doc.setFontSize(9)
    if (business.bank_account_name) doc.text(business.bank_account_name, margin, bankY + 6)
    if (business.bank_sort_code && business.bank_account_number) {
      doc.text(`Sort Code: ${business.bank_sort_code}    Account: ${business.bank_account_number}`, margin, bankY + 11)
    }
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Thank you for your business.', pageWidth / 2, 285, { align: 'center' })
  doc.text('This quote is valid for 30 days.', pageWidth / 2, 290, { align: 'center' })

  // Save
  doc.save(`Quote-${quote.quote_number}.pdf`)
}
