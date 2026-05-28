'use client'

import { useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { Menu, X } from 'lucide-react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-background px-4 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-2.5 -ml-1 hover:bg-muted active:bg-muted/80 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-xs font-bold">Q</span>
          </div>
          <span className="font-semibold tracking-tight">QuoteQuick</span>
        </div>
      </div>

      {/* Sidebar - Desktop always visible, Mobile as drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile close button */}
        <div className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-xs font-bold">Q</span>
            </div>
            <span className="font-semibold tracking-tight">QuoteQuick</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <AppSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden pt-14 md:pt-0">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
