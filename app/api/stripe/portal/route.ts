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
  // Legacy route disabled.
  // Billing portal functionality moved to Server Action: app/(app)/settings/actions.ts
  return NextResponse.json(
    { error: 'This endpoint is deprecated.' },
    { status: 410 }
  );
}
