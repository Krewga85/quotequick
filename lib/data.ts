import type { SupabaseClient } from '@supabase/supabase-js'
import { Quote, QuoteLineItem, Customer } from './types'

// Generate a simple quote number like Q-2405-0017
function generateQuoteNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `Q-${year}${month}-${random}`
}

async function getSupabase() {
  if (typeof window !== 'undefined') {
    // Running in browser - use the browser Supabase client
    // This prevents server-only code (next/headers) from being bundled into client chunks
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  // Server / RSC context - use the server Supabase client
  const { createClient } = await import('./supabase/server')
  return createClient()
}

// Customers (basic for now)
export async function getCustomers(): Promise<Customer[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Quotes
export async function getQuotes(): Promise<Quote[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
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
      const supabase = await getSupabase()
      const { data: items } = await supabase
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
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Calculate totals (20% VAT)
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const vatRate = 20
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  const quoteNumber = generateQuoteNumber()

  // Insert quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: user.id,
      quote_number: quoteNumber,
      customer_id: customerId,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
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

  const { error: itemsError } = await supabase
    .from('quote_line_items')
    .insert(lineItemsWithQuoteId)

  if (itemsError) throw itemsError

  // Return full quote with customer + items
  const { data: fullQuote } = await supabase
    .from('quotes')
    .select(`*, customer:customers(*)`)
    .eq('id', quote.id)
    .single()

  const { data: items } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quote.id)

  return {
    ...fullQuote,
    line_items: items || [],
  } as Quote
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const supabase = await getSupabase()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const { data: items } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', id)

  return {
    ...quote,
    line_items: items || [],
  } as Quote
}

export async function updateQuoteStatus(quoteId: string, status: 'accepted' | 'declined'): Promise<void> {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', quoteId)

  if (error) throw error
}

export async function deleteQuote(id: string): Promise<void> {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ==================== Customers (Full CRUD for Phase 5) ====================

export async function createCustomer(customer: Omit<Customer, 'id' | 'user_id' | 'created_at'>): Promise<Customer> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...customer, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'user_id' | 'created_at'>>): Promise<Customer> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw error
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
  const supabase = await getSupabase()
  const { data, error } = await supabase
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
        const { data: items } = await supabase
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
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch the full quote with customer
  const { data: quoteData, error: quoteErr } = await supabase
    .from('quotes')
    .select(`*, customer:customers(*)`)
    .eq('id', quoteId)
    .single()

  if (quoteErr || !quoteData) throw new Error('Quote not found')

  // Fetch line items
  const { data: lineItems } = await supabase
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

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      quote_id: quoteId,
      invoice_number: invoiceNumber,
      customer_id: fullQuote.customer_id,
      date: fullQuote.date,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
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
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)

  if (error) throw error
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
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
    const { data: items } = await supabase
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
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const subtotal = invoiceData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const vatRate = 20
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  const invoiceNumber = generateInvoiceNumber()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      quote_id: null,
      invoice_number: invoiceNumber,
      customer_id: invoiceData.customer_id,
      date: invoiceData.date,
      due_date: invoiceData.due_date,
      status: 'pending',
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
  const { data: customer } = await supabase
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

export async function getMonthlyInvoiceCount(): Promise<number> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const startOfMonth = `${year}-${month}-01`
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  const { count, error } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  if (error) throw error
  return count || 0
}

// ==================== Business Settings (Phase 6) ====================

export async function getBusinessDetails(
  providedSupabase?: SupabaseClient
): Promise<BusinessDetails> {
  const supabase = providedSupabase || await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  // Return defaults if no settings saved yet
  return data || {
    name: '',
    vat_rate: 20,
    plan: 'free' as const,
  }
}

export async function saveBusinessDetails(
  details: Partial<BusinessDetails>,
  providedSupabase?: SupabaseClient
): Promise<BusinessDetails> {
  const supabase = providedSupabase || await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload = {
    ...details,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('business_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

// Plan helpers
export async function getCurrentPlan(): Promise<Plan> {
  try {
    const details = await getBusinessDetails()
    return details.plan || 'free'
  } catch {
    return 'free'
  }
}
