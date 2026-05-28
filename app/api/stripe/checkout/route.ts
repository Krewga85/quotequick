import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { getBusinessDetails, saveBusinessDetails } from '@/lib/data';

export const dynamic = 'force-dynamic';

const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!plan || !['pro', 'premium'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessDetails = await getBusinessDetails();

    let customerId = businessDetails.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await saveBusinessDetails({
        ...businessDetails,
        stripe_customer_id: customerId,
      });
    }

    const priceId = PRICE_IDS[plan as 'pro' | 'premium'];

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
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
