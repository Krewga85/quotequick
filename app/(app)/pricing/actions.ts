'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const PRICE_IDS = {
  pro: 'price_1TcRb0RWL0hTk5XQVHXWpG7Y',
  premium: 'price_1TcRblRWL0hTk5XQ8PdfzcYy',
} as const

export async function createCheckoutSession(
  plan: 'pro' | 'premium',
  accessToken?: string
) {
  console.log('=== [Checkout Action] START ===');
  console.log('[Checkout Action] plan:', plan);
  console.log('[Checkout Action] accessToken provided:', !!accessToken);
  console.log('[Checkout Action] accessToken length:', accessToken ? accessToken.length : 0);

  if (!accessToken) {
    return { error: 'Not authenticated' };
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

    console.log('[Checkout Action] getUser() result:');
    console.log('  - hasUser:', !!user);
    console.log('  - userId:', user?.id || 'null');
    console.log('  - userEmail:', user?.email || 'null');
    console.log('  - getUserError:', getUserError ? getUserError.message : 'none');
    console.log('  - getUserError code:', getUserError?.code || 'none');

    if (!user) {
      console.log('[Checkout Action] ❌ No user found. Returning "Not authenticated"');
      console.log('=== [Checkout Action] END (early return) ===');
      return { error: 'Not authenticated' };
    }

    console.log('[Checkout Action] ✅ User authenticated successfully');

    if (!plan || !['pro', 'premium'].includes(plan)) {
      return { error: 'Invalid plan' }
    }

    // Get existing stripe_customer_id (or create one) using the same authenticated client
    let { data: businessRow } = await supabase
      .from('business_settings')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = businessRow?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('business_settings')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
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

    console.log('[Checkout Action] Checkout session created successfully');
    console.log('=== [Checkout Action] END (success) ===');
    return { url: session.url }
  } catch (error: any) {
    console.error('[Checkout Action] ❌ Caught exception:');
    console.error('  - message:', error.message);
    console.error('  - name:', error.name);
    console.error('  - stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    console.log('=== [Checkout Action] END (exception) ===');
    return { error: error.message || 'Failed to start checkout' }
  }
}
