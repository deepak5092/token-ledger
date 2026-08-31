-- Phase 3: Vault wrapper functions.
--
-- The `vault` schema isn't exposed via the Data API directly, so these
-- SECURITY DEFINER functions expose exactly the three operations the app
-- needs, callable via supabase.rpc(). Least privilege: any authenticated
-- user can create a secret (write-only — they get back a UUID, never the
-- plaintext back), but only the server (service_role key) can decrypt or
-- delete one, and our server code enforces connection ownership via RLS
-- before ever calling decrypt/delete.

create or replace function create_connection_secret(p_secret text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  v_id := vault.create_secret(p_secret, p_name);
  return v_id;
end;
$$;

create or replace function decrypt_connection_secret(p_vault_secret_id uuid)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_vault_secret_id;
$$;

create or replace function delete_connection_secret(p_vault_secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  delete from vault.secrets where id = p_vault_secret_id;
end;
$$;

revoke all on function create_connection_secret(text, text) from public;
revoke all on function decrypt_connection_secret(uuid) from public;
revoke all on function delete_connection_secret(uuid) from public;

grant execute on function create_connection_secret(text, text) to authenticated, service_role;
grant execute on function decrypt_connection_secret(uuid) to service_role;
grant execute on function delete_connection_secret(uuid) to service_role;
