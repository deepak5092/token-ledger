-- Token Ledger schema (Phase 0 draft / Phase 2 target)
-- Run in the Supabase SQL editor on a fresh project.

create extension if not exists pgcrypto;

create table api_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  provider text not null check (provider in ('anthropic', 'openai')),
  label text,
  vault_secret_id uuid,             -- reference into Supabase Vault (encrypted key)
  created_at timestamptz default now(),
  last_synced_at timestamptz
);

create table usage_records (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references api_connections on delete cascade not null,
  date date not null,
  model text not null,
  input_tokens bigint default 0,
  output_tokens bigint default 0,
  cost_usd numeric(10,4) default 0,
  created_at timestamptz default now(),
  unique (connection_id, date, model)
);

create index usage_records_connection_id_date_idx on usage_records (connection_id, date);
create index api_connections_user_id_idx on api_connections (user_id);

-- Row Level Security: every row is scoped to the owning user, either
-- directly (api_connections.user_id) or via a join (usage_records).

alter table api_connections enable row level security;
alter table usage_records enable row level security;

create policy "Users manage their own connections"
  on api_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read usage for their own connections"
  on usage_records
  for select
  using (
    exists (
      select 1 from api_connections
      where api_connections.id = usage_records.connection_id
        and api_connections.user_id = auth.uid()
    )
  );

-- Inserts/updates to usage_records happen server-side via the service-role
-- client during sync (bypasses RLS), so no write policy is granted to
-- regular users here.

-- Vault: `vault.create_secret(secret, name, description)` returns the
-- secret's id, which is what gets stored in api_connections.vault_secret_id.
-- Decrypt only server-side via:
--   select decrypted_secret from vault.decrypted_secrets where id = $1;
-- If Vault is unavailable on your project tier, fall back to pgsodium/
-- pgcrypto column-level encryption with the same access pattern (decrypt
-- only inside a server-side function, never return the raw key to the client).
