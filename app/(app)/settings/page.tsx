'use client'

import { useEffect, useState } from 'react'
import { getBusinessDetails, saveBusinessDetails, getQuotes, getInvoices } from '@/lib/data'
import { BusinessDetails, Plan } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Upload, X, LogOut, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { exportQuotesToCSV, exportInvoicesToCSV } from '@/lib/export'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState<BusinessDetails>({
    name: '',
    vat_rate: 20,
    plan: 'free',
  })

  // Account state
  const [userEmail, setUserEmail] = useState<string>('')
  const [newEmail, setNewEmail] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const [exportingQuotes, setExportingQuotes] = useState(false)
  const [exportingInvoices, setExportingInvoices] = useState(false)

  useEffect(() => {
    loadSettings()
    loadUser()
  }, [])

  async function loadSettings() {
    try {
      const data = await getBusinessDetails()
      setDetails(data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load business settings')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field: keyof BusinessDetails, value: any) {
    setDetails(prev => ({ ...prev, [field]: value }))
  }

  // Logo upload with client-side resize
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Resize to max 300px width/height
        const canvas = document.createElement('canvas')
        const maxSize = 300
        let { width, height } = img

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        const base64 = canvas.toDataURL('image/png', 0.85)
        updateField('logo', base64)
        toast.success('Logo uploaded (resized)')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    updateField('logo', null)
  }

  async function handleSave() {
    if (!details.name.trim()) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)
    try {
      await saveBusinessDetails(details)
      toast.success('Business settings saved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Load current authenticated user email
  async function loadUser() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setNewEmail(user.email)
      }
    } catch (e) {
      console.error('Failed to load user', e)
    }
  }

  // Update email address (Supabase sends confirmation email if required)
  async function handleUpdateEmail() {
    if (!newEmail || newEmail === userEmail) {
      toast.error('Please enter a different email address')
      return
    }

    setUpdatingEmail(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      toast.success('Email update requested — check your inbox to confirm the change')
      setUserEmail(newEmail)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email')
    } finally {
      setUpdatingEmail(false)
    }
  }

  // Change password
  async function handleUpdatePassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setUpdatingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password')
    } finally {
      setUpdatingPassword(false)
    }
  }

  // Export helpers (lazy load data then download)
  async function handleExportQuotes() {
    setExportingQuotes(true)
    try {
      const quotes = await getQuotes()
      if (quotes.length === 0) {
        toast.error('No quotes to export yet')
        return
      }
      exportQuotesToCSV(quotes)
      toast.success(`Exported ${quotes.length} quotes`)
    } catch (e) {
      toast.error('Failed to export quotes')
    } finally {
      setExportingQuotes(false)
    }
  }

  async function handleExportInvoices() {
    setExportingInvoices(true)
    try {
      const invoices = await getInvoices()
      if (invoices.length === 0) {
        toast.error('No invoices to export yet')
        return
      }
      exportInvoicesToCSV(invoices)
      toast.success(`Exported ${invoices.length} invoices`)
    } catch (e) {
      toast.error('Failed to export invoices')
    } finally {
      setExportingInvoices(false)
    }
  }

  // Sign out
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, subscription, and business details for quotes and invoices.
        </p>
      </div>

      {/* Current Plan Banner */}
      <div className="card p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Current Plan</div>
          <div className="text-xl font-semibold capitalize">{details.plan} Plan</div>
          {details.plan === 'free' && (
            <div className="text-sm text-muted-foreground mt-0.5">
              You can create up to 20 invoices per month.
            </div>
          )}
        </div>
        {details.plan === 'free' ? (
          <Button asChild variant="default" size="sm">
            <a href="/pricing">Upgrade to Pro</a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const res = await fetch('/api/stripe/portal', { method: 'POST' });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
            }}
          >
            Manage Subscription
          </Button>
        )}
      </div>

      {/* Account Settings */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-1">Account</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your login details and download everything you've created.
        </p>

        {/* Email */}
        <div className="mb-6">
          <Label className="text-xs text-muted-foreground">Email address</Label>
          <div className="flex flex-col sm:flex-row gap-3 mt-1.5">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
              placeholder="you@trades.co.uk"
            />
            <Button
              onClick={handleUpdateEmail}
              disabled={updatingEmail || !newEmail || newEmail === userEmail}
              variant="outline"
            >
              {updatingEmail ? 'Updating...' : 'Update email'}
            </Button>
          </div>
          {userEmail && newEmail !== userEmail && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Changing email will require confirmation via a link sent to the new address.
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-6">
          <Label className="text-xs text-muted-foreground">Change password</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <div className="mt-3">
            <Button
              onClick={handleUpdatePassword}
              disabled={updatingPassword || !newPassword}
              variant="outline"
              size="sm"
            >
              {updatingPassword ? 'Updating password...' : 'Update password'}
            </Button>
          </div>
        </div>

        {/* Data Export */}
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">Your data</div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleExportQuotes}
              disabled={exportingQuotes}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportingQuotes ? 'Exporting quotes...' : 'Export quotes (CSV)'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportInvoices}
              disabled={exportingInvoices}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportingInvoices ? 'Exporting invoices...' : 'Export invoices (CSV)'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Downloads everything in your account as easy-to-open CSV files.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Company Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Company / Trading Name *</Label>
              <Input
                id="name"
                value={details.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="ABC Plumbing Ltd"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={details.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="07700 900123"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={details.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="hello@yourcompany.co.uk"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                value={details.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="123 High Street&#10;London&#10;SW1A 1AA"
              />
            </div>

            <div>
              <Label htmlFor="company_number">Company Registration Number</Label>
              <Input
                id="company_number"
                value={details.company_number || ''}
                onChange={(e) => updateField('company_number', e.target.value)}
                placeholder="12345678"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="vat_rate">VAT Rate (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                value={details.vat_rate}
                onChange={(e) => updateField('vat_rate', parseFloat(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Logo</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your company logo. It will appear on quotes and invoices (Pro & Premium plans recommended).
          </p>

          {details.logo ? (
            <div className="flex items-start gap-4">
              <div className="border rounded-lg p-4 bg-white">
                <img src={details.logo} alt="Company logo" className="max-h-20 max-w-[200px] object-contain" />
              </div>
              <Button variant="outline" size="sm" onClick={removeLogo}>
                <X className="h-4 w-4 mr-2" /> Remove logo
              </Button>
            </div>
          ) : (
            <div>
              <label className="cursor-pointer">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-xl h-40 w-full hover:border-muted-foreground/60 transition-colors">
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                  <div className="text-sm font-medium">Click to upload logo</div>
                  <div className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB (will be resized)</div>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Bank Details</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These appear on your invoices for customer payments.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="bank_account_name">Account Name</Label>
              <Input
                id="bank_account_name"
                value={details.bank_account_name || ''}
                onChange={(e) => updateField('bank_account_name', e.target.value)}
                placeholder="John Smith T/A ABC Plumbing"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="bank_sort_code">Sort Code</Label>
              <Input
                id="bank_sort_code"
                value={details.bank_sort_code || ''}
                onChange={(e) => updateField('bank_sort_code', e.target.value)}
                placeholder="12-34-56"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="bank_account_number">Account Number</Label>
              <Input
                id="bank_account_number"
                value={details.bank_account_number || ''}
                onChange={(e) => updateField('bank_account_number', e.target.value)}
                placeholder="12345678"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Saving...' : 'Save Business Settings'}
          </Button>
        </div>
      </div>

      {/* Sign out */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
