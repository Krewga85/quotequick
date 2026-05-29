import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
// Commented to prevent server-only (next/headers) from affecting build
// import { getUserFromRequest } from '@/lib/supabase/server';
// import { getBusinessDetails } from '@/lib/data';

/**
 * NOTE: The main billing portal flow now uses a Server Action
 * (see app/(app)/settings/actions.ts).
 * This route is kept for backward compatibility but is no longer called
 * from the Settings page.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const businessDetails = await getBusinessDetails();

    if (!businessDetails.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: businessDetails.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
