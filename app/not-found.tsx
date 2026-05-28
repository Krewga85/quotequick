import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <div className="text-left">
            <div className="font-semibold tracking-tighter text-2xl">QuoteQuick</div>
            <div className="text-[10px] text-muted-foreground -mt-1 tracking-[2px]">UK TRADES</div>
          </div>
        </div>

        <div className="text-[92px] font-semibold tracking-[-6px] leading-none text-muted-foreground/70 mb-3">
          404
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-3">Page not found</h1>
        
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/quotes">My Quotes</Link>
          </Button>
        </div>

        <div className="mt-12 text-xs text-muted-foreground">
          Need help? <Link href="/settings" className="underline hover:text-foreground">Check your settings</Link> or contact support.
        </div>
      </div>
    </div>
  )
}
