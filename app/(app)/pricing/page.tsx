'use client'

import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { createCheckoutSession } from './actions'

const plans = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Perfect for trying QuoteQuick with professional tools.',
    features: [
      'Unlimited quotes',
      'Maximum 20 invoices per month',
      'Professional PDF quotes & invoices',
      'Standard QuoteQuick branding',
      'Customer management',
      'Email support',
    ],
    buttonText: 'Current Plan',
    popular: false,
    disabled: true,
  },
  {
    name: 'Pro',
    price: '£12',
    period: 'per month',
    description: 'For tradespeople who want unlimited usage and clean, professional PDFs.',
    features: [
      'Unlimited quotes',
      'Unlimited invoices',
      'Remove QuoteQuick branding from PDFs',
      'Priority email support',
      'Everything in Free plan',
    ],
    buttonText: 'Upgrade to Pro',
    popular: true,
    disabled: false,
  },
  {
    name: 'Premium',
    price: '£19',
    period: 'per month',
    description: 'Everything in Pro plus custom logo and top-tier support.',
    features: [
      'Everything in Pro plan',
      'Custom logo support on all PDFs',
      'Priority support (email + phone)',
      'Advanced features',
    ],
    buttonText: 'Upgrade to Premium',
    popular: false,
    disabled: false,
  },
]

export default function PricingPage() {
  const handleUpgrade = async (plan: 'pro' | 'premium') => {
    try {
      const result = await createCheckoutSession(plan)

      if (result.url) {
        window.location.href = result.url
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-semibold tracking-tighter">Simple, transparent pricing</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
          Start free. Upgrade when you need more power. No hidden fees.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`rounded-2xl border p-8 flex flex-col ${
              plan.popular 
                ? 'border-white bg-card relative shadow-xl scale-[1.01]' 
                : 'border-border bg-card'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-zinc-950 text-xs font-semibold px-4 py-1 rounded-full tracking-wider">
                MOST POPULAR
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-semibold tracking-tighter">{plan.price}</span>
                <span className="ml-1 text-muted-foreground">/ {plan.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground min-h-[48px]">{plan.description}</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleUpgrade(plan.name.toLowerCase() as 'pro' | 'premium')}
              disabled={plan.disabled}
              variant={plan.popular ? "default" : "outline"}
              className={`w-full h-11 text-base ${
                plan.popular 
                  ? "bg-white text-zinc-950 hover:bg-zinc-200" 
                  : ""
              }`}
            >
              {plan.disabled ? 'Current Plan' : plan.buttonText}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        All plans include unlimited PDF downloads and mobile access.<br />
        Questions? <a href="mailto:hello@quotequick.uk" className="underline hover:text-foreground">Contact us</a>
      </div>
    </div>
  )
}
