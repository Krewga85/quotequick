'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCustomers, createCustomer } from '@/lib/data'
import { Customer } from '@/lib/types'
import { Plus, User } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setCustomers(await getCustomers())
    } finally { setLoading(false) }
  }

  async function handleAdd() {
    if (!form.name.trim()) return toast.error('Name required')
    try {
      const created = await createCustomer(form)
      setCustomers([created, ...customers])
      setForm({ name: '', email: '', phone: '', address: '' })
      setShowForm(false)
      toast.success('Customer added')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

        {showForm && (
          <div className="card p-6 mb-6 max-w-lg">
            <div className="grid grid-cols-1 gap-3">
              <input 
                placeholder="Name / Company *" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                className="px-4 py-2 rounded-md border border-input bg-background" 
              />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="px-4 py-2 rounded-md border border-input bg-background" />
                <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-4 py-2 rounded-md border border-input bg-background" />
              </div>
              <textarea 
                placeholder="Address" 
                value={form.address} 
                onChange={e => setForm({ ...form, address: e.target.value })} 
                className="px-4 py-2 rounded-md border border-input bg-background" 
                rows={2} 
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd}>Save Customer</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card p-10">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="card p-10">
            <EmptyState
              icon={User}
              title="No customers yet"
              description="Add your regular clients here so they appear instantly when you're creating quotes and invoices on site."
              hint="You can add them as you go — no need to do it all upfront."
              action={{
                label: 'Add your first customer',
                onClick: () => setShowForm(true),
                variant: 'default',
              }}
            />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map(c => (
              <div key={c.id} className="card p-6">
                <div className="font-semibold">{c.name}</div>
                {c.phone && <div className="text-sm text-muted-foreground">{c.phone}</div>}
                {c.email && <div className="text-sm text-muted-foreground">{c.email}</div>}
                {c.address && <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{c.address}</div>}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
