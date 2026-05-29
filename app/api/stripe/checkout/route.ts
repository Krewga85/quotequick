import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
// Commented to prevent server-only (next/headers) from affecting build
// import { getUserFromRequest } from '@/lib/supabase/server';
// import { getBusinessDetails, saveBusinessDetails } from '@/lib/data';

/**
 * NOTE: The main checkout flow now uses a Server Action (see app/(app)/pricing/actions.ts).
 * This route is kept for backward compatibility / future use but is no longer called from the pricing page.
 */

export const dynamic = 'force-dynamic';

const PRICE_IDS = {
  pro: 'price_1TcRb0RWL0hTk5XQVHXWpG7Y',
  premium: 'price_1TcRblRWL0hTk5XQ8PdfzcYy',
};

export async function POST(req: NextRequest) {
  // Legacy route disabled.
  // Checkout functionality moved to Server Action: app/(app)/pricing/actions.ts
  return NextResponse.json(
    { error: 'This endpoint is deprecated.' },
    { status: 410 }
  );
}
