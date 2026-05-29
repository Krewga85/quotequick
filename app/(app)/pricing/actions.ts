'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getBusinessDetails, saveBusinessDetails } from '@/lib/data'
import { stripe } from '@/lib/stripe'

const PRICE_IDS = {
  pro: 'price_1TcRb0RWL0hTk5XQVHXWpG7Y',
  premium: 'price_1TcRblRWL0hTk5XQ8PdfzcYy',
} as const

export async function createCheckoutSession(
  plan: 'pro' | 'premium',
  accessToken?: string
) {
  try {
    // Use token-based client if accessToken is provided (more reliable for Server Actions)
    // Otherwise fall back to cookie-based client
    const supabase = accessToken
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          }
        )
      : await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    if (!plan || !['pro', 'premium'].includes(plan)) {
      return { error: 'Invalid plan' }
    }

    const businessDetails = await getBusinessDetails()

    let customerId = businessDetails.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id

      await saveBusinessDetails({
        ...businessDetails,
        stripe_customer_id: customerId,
      })
    }

    const priceId = PRICE_IDS[plan]

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan,
      },
    })

    return { url: session.url }
  } catch (error: any) {
    console.error('createCheckoutSession error:', error)
    return { error: error.message || 'Failed to start checkout' }
  }
}
