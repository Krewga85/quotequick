'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  Plus,
  Receipt,
  Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quotes/new', label: 'New Quote', icon: Plus },
  { href: '/quotes', label: 'My Quotes', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/pricing', label: 'Pricing', icon: Crown },
]

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  const handleNavClick = () => {
    onNavigate?.()
  }

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar md:border-r">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold tracking-tighter text-lg">QuoteQuick</div>
            <div className="text-[10px] text-muted-foreground -mt-1">UK TRADES</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4">
        <div className="space-y-1 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer / Upgrade teaser */}
      <div className="border-t p-4 space-y-2">
        <Button variant="outline" className="w-full justify-start" asChild onClick={handleNavClick}>
          <Link href="/pricing">
            Upgrade to Pro
          </Link>
        </Button>
        <div className="text-[10px] text-center text-muted-foreground">
          Free plan • 20 invoices/mo
        </div>
      </div>
    </div>
  )
}
