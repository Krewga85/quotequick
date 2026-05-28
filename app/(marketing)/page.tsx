import Link from 'next/link'
import { FileText, Clock, Users, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tighter text-xl">QuoteQuick</div>
              <div className="text-[10px] text-muted-foreground -mt-1">UK TRADES</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Button asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block mb-4 px-4 py-1 rounded-full bg-muted text-xs tracking-widest text-muted-foreground border border-border">
          BUILT FOR THE JOB SITE
        </div>

        <h1 className="text-6xl sm:text-7xl font-semibold tracking-tighter leading-none mb-6">
          Professional quotes.<br />In seconds.
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-10">
          The fast, clean quoting and invoicing tool made for UK tradespeople at <span className="font-medium text-foreground">quotequick.uk</span>. 
          Plumbers, electricians, builders — create professional documents with VAT, 
          save customers, and generate clean PDFs without the hassle.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="h-12 px-8 text-base">
            <Link href="/signup">
              Get started free — no card required
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
            <Link href="/login">
              Log in to existing account
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free plan: Unlimited quotes, up to 20 invoices per month.
        </p>
      </div>

      {/* Benefits */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              icon: Clock, 
              title: "Built for speed", 
              desc: "Create a full professional quote with line items in under a minute while you're still on site." 
            },
            { 
              icon: FileText, 
              title: "Professional PDFs", 
              desc: "Clean, trustworthy documents with your branding, 20% VAT breakdown, and proper payment details." 
            },
            { 
              icon: Users, 
              title: "Save time on repeat work", 
              desc: "Add customers once. Pull them into new quotes instantly with all their details ready." 
            },
            { 
              icon: FileCheck, 
              title: "Everything in one place", 
              desc: "Quotes, invoices, customers, and your business details — all managed simply in one tool." 
            },
          ].map((benefit, i) => (
            <div key={i} className="card p-6">
              <benefit.icon className="h-6 w-6 mb-4 text-muted-foreground" />
              <div className="font-semibold mb-2">{benefit.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Who it's for */}
      <div className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <div className="text-sm font-medium tracking-widest text-muted-foreground mb-3">FOR UK TRADESPEOPLE</div>
        <h2 className="text-3xl font-semibold tracking-tight mb-4">
          Made for the people who actually do the work
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Whether you're a plumber, electrician, builder, or any other tradesperson, 
          QuoteQuick gives you the professional tools you need without the complexity.
        </p>
      </div>

      {/* Final CTA */}
      <div className="border-t border-border bg-muted/50 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-semibold tracking-tight mb-3">Ready to quote faster?</h3>
          <p className="text-muted-foreground mb-6">Join tradespeople who are saving hours every week.</p>
          <Button asChild size="lg" className="h-12 px-8 text-base">
            <Link href="/signup">Create your free account</Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required • Cancel anytime</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-muted-foreground">
          QuoteQuick — Professional quoting for UK trades • <a href="https://quotequick.uk" className="hover:text-foreground transition-colors">quotequick.uk</a>
        </div>
      </footer>
    </div>
  )
}
