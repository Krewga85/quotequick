export type QuoteStatus = 'pending' | 'accepted' | 'declined'
export type InvoiceStatus = 'pending' | 'paid'

export interface Customer {
  id: string
  user_id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  created_at: string
}

export interface QuoteLineItem {
  id?: string
  description: string
  type: 'labour' | 'materials'
  quantity: number
  unit_price: number
}

export interface Quote {
  id: string
  user_id: string
  quote_number: string
  customer_id: string
  customer?: Customer
  date: string
  status: QuoteStatus
  line_items: QuoteLineItem[]
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  notes?: string | null
  created_at: string
}

export type Plan = 'free' | 'pro' | 'premium'

export interface BusinessDetails {
  id?: string
  user_id?: string
  // Company Info
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  company_number?: string | null
  // Branding
  logo?: string | null // base64 data URL
  // Banking
  bank_account_name?: string | null
  bank_sort_code?: string | null
  bank_account_number?: string | null
  // Settings
  vat_rate: number // default 20
  // Plan
  plan: Plan // default 'free'
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
  updated_at?: string
}

export interface InvoiceLineItem {
  id?: string
  description: string
  type: 'labour' | 'materials'
  quantity: number
  unit_price: number
}

export interface Invoice {
  id: string
  user_id: string
  quote_id?: string | null
  invoice_number: string
  customer_id: string
  customer?: Customer
  quote?: Quote
  date: string
  due_date: string
  status: InvoiceStatus
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  notes?: string | null
  line_items?: InvoiceLineItem[]
  created_at: string
}
