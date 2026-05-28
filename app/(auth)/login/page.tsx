'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Welcome back!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tighter text-2xl">QuoteQuick</div>
            <div className="text-[10px] text-muted-foreground -mt-1">UK TRADES</div>
          </div>
        </Link>
      </div>

      <div className="card p-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
        <p className="text-muted-foreground text-sm mb-6">Sign in to your account</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5 text-muted-foreground">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 text-sm"
              placeholder="you@trades.co.uk"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5 text-muted-foreground">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm"
            />
          </div>

          <Button type="submit" className="w-full h-11 mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-foreground hover:underline">Create one free</Link>
        </p>
      </div>
    </>
  )
}
