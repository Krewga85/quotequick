'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Plus, Users, LayoutDashboard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/quotes/new', label: 'New Quote', icon: Plus },
    { href: '/quotes', label: 'My Quotes', icon: FileText },
    { href: '/customers', label: 'Customers', icon: Users },
  ]

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-zinc-950">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tighter">QuoteQuick</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive(item.href) 
                      ? 'bg-zinc-900 text-white' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  )
}
