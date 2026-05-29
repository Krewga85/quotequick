'use client'

import { useEffect, useState } from 'react'
import { getBusinessDetails, saveBusinessDetails } from '@/lib/data'
import { BusinessDetails } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import { createBillingPortalSession } from './actions'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState<BusinessDetails>({
    name: '',
    vat_rate: 20,
    plan: 'free',
  })

  useEffect(() => {
    loadSettings()
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">My Business</h1>
        <p className="text-muted-foreground mt-1">
          These details will automatically appear on your quotes and invoices.
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
              try {
                const result = await createBillingPortalSession()
                if (result.url) {
                  window.location.href = result.url
                }
              } catch (error: any) {
                toast.error(error.message || 'Failed to open billing portal')
              }
            }}
          >
            Manage Subscription
          </Button>
        )}
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
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            Upload your company logo. It will appear on quotes and invoices.
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
    </div>
  )
}
