import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan as 'pro' | 'premium';

        if (userId && plan && session.customer) {
          await supabaseAdmin
            .from('business_settings')
            .upsert({
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              plan,
              subscription_status: 'active',
              current_period_end: new Date(
                (session as any).current_period_end * 1000
              ).toISOString(),
            }, { onConflict: 'user_id' });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: settings } = await supabaseAdmin
          .from('business_settings')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (settings?.user_id) {
          let plan: 'free' | 'pro' | 'premium' = 'free';
          let status = subscription.status;

          if (subscription.status === 'active') {
            const priceId = subscription.items.data[0]?.price.id;
            if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';
            if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) plan = 'premium';
          }

          await supabaseAdmin
            .from('business_settings')
            .update({
              plan,
              subscription_status: status,
              current_period_end: (subscription as any).current_period_end 
                ? new Date((subscription as any).current_period_end * 1000).toISOString() 
                : null,
            })
            .eq('user_id', settings.user_id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
