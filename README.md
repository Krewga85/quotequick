# QuoteQuick

**Professional quoting tool for UK tradespeople.**  
Fast, clean, and reliable. Create beautiful VAT-ready quotes in seconds, save customers, and generate polished PDFs — built for the job site.

## Tech Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Auth + Database)
- jsPDF for professional PDF generation
- Sonner for clean notifications

## Getting Started

### 1. Supabase Setup (Required)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` / `public` key
3. Copy `.env.example` → `.env.local` and fill in the values.

### 2. Database Schema

Run the following SQL in the Supabase SQL Editor (one time):

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Customers table
create table customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  address text,
  created_at timestamptz default now()
);

-- Quotes table
create table quotes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quote_number text not null,
  customer_id uuid references customers(id) on delete set null,
  date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  subtotal numeric(10,2) not null,
  vat_rate numeric(5,2) not null default 20.00,
  vat_amount numeric(10,2) not null,
  total numeric(10,2) not null,
  notes text,
  created_at timestamptz default now()
);

-- Quote line items
create table quote_line_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes(id) on delete cascade not null,
  description text not null,
  type text not null check (type in ('labour', 'materials')),
  quantity numeric(10,2) not null,
  unit_price numeric(10,2) not null
);

-- Enable Row Level Security
alter table customers enable row level security;
alter table quotes enable row level security;
alter table quote_line_items enable row level security;

-- RLS Policies (users can only access their own data)
create policy "Users can manage their own customers" on customers
  for all using (auth.uid() = user_id);

create policy "Users can manage their own quotes" on quotes
  for all using (auth.uid() = user_id);

create policy "Users can manage line items for their quotes" on quote_line_items
  for all using (
    auth.uid() = (select user_id from quotes where id = quote_id)
  );
```

### 3. Run the App

```bash
npm run dev
```

Open http://localhost:3000

Sign up with email/password, then start creating quotes.

## Features (MVP)

- Email + password authentication (Supabase)
- Create quotes with dynamic labour/material line items
- Automatic 20% UK VAT calculation
- Professional PDF generation (dark header, clean tables)
- Save & reuse customers
- Dashboard + My Quotes list with status management
- Clean, fast, mobile-friendly interface built for trades

## Project Structure

- `app/` — Pages & routes (landing, login, signup, dashboard, quotes, customers)
- `lib/` — Supabase clients, types, PDF generator
- `components/` — Reusable UI pieces

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a complete Vercel + Supabase + Stripe production deployment guide, including environment variable setup.

## Next Steps / Future

- Advanced reporting
- Team accounts
- Job scheduling integration

Built for the people who actually do the work.
