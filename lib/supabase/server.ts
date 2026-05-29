import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing the session.
          }
        },
      },
    }
  )
}

/**
 * Reliable auth helper for API Route Handlers.
 * Tries Authorization: Bearer token first (best when called from client components via fetch),
 * then falls back to cookie-based session from middleware.
 */
export async function getUserFromRequest(req: NextRequest) {
  // Try Authorization Bearer token first (useful for some client → API calls)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      )
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        return { user, supabase }
      }
    } catch {
      // Ignore and fall through to cookie fallback
    }
  }

  // Fallback to cookie-based auth (reliable for Server Actions and most cases)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}
