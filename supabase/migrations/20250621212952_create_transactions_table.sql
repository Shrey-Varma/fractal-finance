create table if not exists public.transactions (
  transaction_id text primary key,
  account_id text,
  amount numeric,
  iso_currency_code text,
  name text,
  merchant_name text,
  merchant_entity_id text,
  logo_url text,
  website text,
  date date,
  authorized_date date,
  pending boolean,
  payment_channel text,
  transaction_type text,
  category jsonb,
  counterparties jsonb,
  location jsonb,
  personal_finance_category jsonb,
  created_at timestamptz default now()
);
create index on public.transactions (account_id);
create index on public.transactions (date);
