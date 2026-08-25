-- Public tracking fields are exposed only through get_public_tracking().
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  freight_id text not null unique check (freight_id ~ '^FR-[A-Z0-9]{8}$'),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  origin text not null,
  destination text not null,
  status text not null default 'Booked',
  estimated_delivery date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table shipments enable row level security;

create policy "operators can create their own shipments" on shipments
  for insert to authenticated with check (owner_id = auth.uid());
create policy "operators can view their own shipments" on shipments
  for select to authenticated using (owner_id = auth.uid());

create or replace function get_public_tracking(requested_freight_id text)
returns table (freight_id text, status text, origin text, destination text, estimated_delivery date, updated_at timestamptz)
language sql security definer set search_path = public
as $$
  select s.freight_id, s.status, s.origin, s.destination, s.estimated_delivery, s.updated_at
  from shipments s
  where s.freight_id = upper(requested_freight_id);
$$;

grant execute on function get_public_tracking(text) to anon, authenticated;
