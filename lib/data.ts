import { createClient } from './supabase/client'
import { Quote, QuoteLineItem, Customer, QuoteStatus, BusinessDetails, Invoice, InvoiceStatus, Plan, InvoiceLineItem } from './types'

// Generate a simple quote number like Q-2405-0017
function generateQuoteNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `Q-${year}${month}-${random}`
}

function getSupabase() {
  return createClient()
}

// Customers
export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await getSupabase()
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'user_id' | 'created_at'>): Promise<Customer> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await getSupabase()
    .from('customers')
    .insert({ ...customer, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

// Quotes
export async function getQuotes(): Promise<Quote[]> {
  const { data, error } = await getSupabase()
    .from('quotes')
    .select(`
      *,
      customer:customers(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Fetch line items for each quote
  const quotesWithItems = await Promise.all(
    (data || []).map(async (quote) => {
      const { data: items } = await getSupabase()
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quote.id)
      
      return {
        ...quote,
        line_items: items || [],
      } as Quote
    })
  )

  return quotesWithItems
}

export async function createQuote(
  customerId: string,
  lineItems: QuoteLineItem[],
  notes?: string
): Promise<Quote> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Calculate totals (20% VAT)
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const vatRate = 20
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  const quoteNumber = generateQuoteNumber()

  // Insert quote
  const { data: quote, error: quoteError } = await getSupabase()
    .from('quotes')
    .insert({
      user_id: user.id,
      quote_number: quoteNumber,
      customer_id: customerId,
      date: new Date().toISOString().split('T')[0],
      status: 'pending' as QuoteStatus,
      subtotal: Number(subtotal.toFixed(2)),
      vat_rate: vatRate,
      vat_amount: Number(vatAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      notes: notes || null,
    })
    .select()
    .single()

  if (quoteError) throw quoteError

  // Insert line items
  const lineItemsWithQuoteId = lineItems.map(item => ({
    quote_id: quote.id,
    description: item.description,
    type: item.type,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }))

  const { error: itemsError } = await getSupabase()
    .from('quote_line_items')
    .insert(lineItemsWithQuoteId)

  if (itemsError) throw itemsError

  // Return full quote with customer + items
  const { data: fullQuote } = await getSupabase()
    .from('quotes')
    .select(`*, customer:customers(*)`)
    .eq('id', quote.id)
    .single()

  const { data: items } = await getSupabase()
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quote.id)

  return {
    ...fullQuote,
    line_items: items || [],
  } as Quote
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<void> {
  const { error } = await getSupabase()
    .from('quotes')
    .update({ status })
    .eq('id', quoteId)

  if (error) throw error
}

export async function deleteQuote(quoteId: string): Promise<void> {
  // Line items cascade delete via RLS + DB
  const { error } = await getSupabase()
    .from('quotes')
    .delete()
    .eq('id', quoteId)

  if (error) throw error
}

// ==================== Business Settings ====================

export async function getBusinessDetails(): Promise<BusinessDetails> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await getSupabase()
    .from('business_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw error
  }

  // Return defaults if no settings saved yet
  return data || {
    name: '',
    vat_rate: 20,
    plan: 'free' as const,
  }
}

// Helper to get subscription-aware plan
export async function getUserSubscriptionStatus() {
  const details = await getBusinessDetails();
  return {
    plan: details.plan || 'free',
    status: details.subscription_status || null,
    current_period_end: details.current_period_end || null,
    isActive: details.plan !== 'free' && details.subscription_status === 'active',
  };
}

export async function saveBusinessDetails(details: Partial<BusinessDetails>): Promise<BusinessDetails> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload = {
    ...details,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await getSupabase()
    .from('business_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== Invoices ====================

function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `INV-${year}${month}-${random}`
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await getSupabase()
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      quote:quotes(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Fetch line items for the related quotes (PDF generator needs full quote data)
  const invoicesWithData = await Promise.all(
    (data || []).map(async (inv: any) => {
      if (inv.quote) {
        const { data: items } = await getSupabase()
          .from('quote_line_items')
          .select('*')
          .eq('quote_id', inv.quote.id)
        inv.quote.line_items = items || []
      }
      return inv as Invoice
    })
  )

  return invoicesWithData
}

export async function createInvoiceFromQuote(quoteId: string): Promise<Invoice> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // === Plan Enforcement for Free users ===
  const plan = await getCurrentPlan()
  if (plan === 'free') {
    const canCreate = await canCreateMoreInvoices()
    if (!canCreate) {
      throw new Error('FREE_LIMIT_REACHED')
    }
  }

  // Fetch the full quote with customer
  const { data: quoteData, error: quoteErr } = await getSupabase()
    .from('quotes')
    .select(`*, customer:customers(*)`)
    .eq('id', quoteId)
    .single()

  if (quoteErr || !quoteData) throw new Error('Quote not found')

  // Fetch line items
  const { data: lineItems } = await getSupabase()
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId)

  const fullQuote = {
    ...quoteData,
    line_items: lineItems || []
  } as Quote

  const invoiceNumber = generateInvoiceNumber()
  const dueDate = new Date(fullQuote.date)
  dueDate.setDate(dueDate.getDate() + 14)

  const { data: invoice, error } = await getSupabase()
    .from('invoices')
    .insert({
      user_id: user.id,
      quote_id: quoteId,
      invoice_number: invoiceNumber,
      customer_id: fullQuote.customer_id,
      date: fullQuote.date,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending' as InvoiceStatus,
      subtotal: fullQuote.subtotal,
      vat_rate: fullQuote.vat_rate,
      vat_amount: fullQuote.vat_amount,
      total: fullQuote.total,
    })
    .select()
    .single()

  if (error) throw error

  return {
    ...invoice,
    customer: fullQuote.customer,
    quote: fullQuote,
  } as Invoice
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void> {
  const { error } = await getSupabase()
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)

  if (error) throw error
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await getSupabase()
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      quote:quotes(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (data?.quote) {
    const { data: items } = await getSupabase()
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', data.quote.id)
    data.quote.line_items = items || []
  }

  // For standalone invoices, line_items may be stored as JSON
  if (!data.quote && data.line_items_json) {
    data.line_items = data.line_items_json
  }

  return data as Invoice
}

export async function createInvoice(invoiceData: {
  customer_id: string
  date: string
  due_date: string
  line_items: InvoiceLineItem[]
  notes?: string
}): Promise<Invoice> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Plan enforcement
  const plan = await getCurrentPlan()
  if (plan === 'free') {
    const canCreate = await canCreateMoreInvoices()
    if (!canCreate) {
      throw new Error('FREE_LIMIT_REACHED')
    }
  }

  const subtotal = invoiceData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const vatRate = 20
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  const invoiceNumber = generateInvoiceNumber()

  const { data: invoice, error } = await getSupabase()
    .from('invoices')
    .insert({
      user_id: user.id,
      quote_id: null,
      invoice_number: invoiceNumber,
      customer_id: invoiceData.customer_id,
      date: invoiceData.date,
      due_date: invoiceData.due_date,
      status: 'pending' as InvoiceStatus,
      subtotal: Number(subtotal.toFixed(2)),
      vat_rate: vatRate,
      vat_amount: Number(vatAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      notes: invoiceData.notes || null,
      line_items_json: invoiceData.line_items, // Store as JSON for standalone
    })
    .select()
    .single()

  if (error) throw error

  // Fetch customer for return
  const { data: customer } = await getSupabase()
    .from('customers')
    .select('*')
    .eq('id', invoiceData.customer_id)
    .single()

  return {
    ...invoice,
    customer,
    line_items: invoiceData.line_items,
  } as Invoice
}

export async function updateInvoice(
  invoiceId: string,
  updates: Partial<{
    customer_id: string
    date: string
    due_date: string
    line_items: InvoiceLineItem[]
    notes: string | null
    status: InvoiceStatus
  }>
): Promise<Invoice> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload: any = { ...updates }

  if (updates.line_items) {
    const subtotal = updates.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const vatRate = 20
    const vatAmount = subtotal * (vatRate / 100)

    payload.subtotal = Number(subtotal.toFixed(2))
    payload.vat_rate = vatRate
    payload.vat_amount = Number(vatAmount.toFixed(2))
    payload.total = Number((subtotal + vatAmount).toFixed(2))
    payload.line_items_json = updates.line_items
    delete payload.line_items
  }

  const { data: invoice, error } = await getSupabase()
    .from('invoices')
    .update(payload)
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) throw error

  return invoice as Invoice
}

// ==================== Plan & Limits ====================

export async function getCurrentPlan(): Promise<Plan> {
  try {
    const details = await getBusinessDetails()
    // If subscription is not active, treat as free
    if (details.plan !== 'free' && details.subscription_status !== 'active') {
      return 'free'
    }
    return details.plan || 'free'
  } catch {
    return 'free'
  }
}

/**
 * Returns how many invoices the current user has created in the current calendar month.
 */
export async function getMonthlyInvoiceCount(): Promise<number> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) return 0

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { count, error } = await getSupabase()
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  if (error) {
    console.error('Error counting monthly invoices:', error)
    return 0
  }

  return count || 0
}

/**
 * Returns whether the current user can create more invoices this month.
 */
export async function canCreateMoreInvoices(): Promise<boolean> {
  const plan = await getCurrentPlan()
  if (plan !== 'free') return true

  const count = await getMonthlyInvoiceCount()
  return count < 20
}
