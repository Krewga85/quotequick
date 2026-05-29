'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getBusinessDetails } from '@/lib/data'
import { stripe } from '@/lib/stripe'

export async function createBillingPortalSession(accessToken?: string) {
  try {
    // Use token-based client if accessToken is provided (more reliable for Server Actions)
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

    const businessDetails = await getBusinessDetails()

    if (!businessDetails.stripe_customer_id) {
      return { error: 'No active subscription found' }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: businessDetails.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
    })

    return { url: portalSession.url }
  } catch (error: any) {
    console.error('createBillingPortalSession error:', error)
    return { error: error.message || 'Failed to open billing portal' }
  }
}
