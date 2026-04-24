-- FreightSimple initial schema for carrier-side operations.
create extension if not exists "pgcrypto";

create table if not exists carriers (
  id text primary key,
  name text not null,
  dot_number text,
  mc_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  name text not null,
  phone text,
  eld_provider text,
  hours_available numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trucks (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  unit_number text not null,
  equipment_type text,
  status text not null default 'available',
  current_location text,
  driver_id uuid references drivers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trailers (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  trailer_number text not null,
  equipment_type text,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists connected_accounts (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  provider text not null,
  category text not null,
  connection_status text not null default 'mocked',
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracking_providers (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  provider_name text not null,
  status text not null default 'mocked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists eld_providers (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  provider_name text not null,
  status text not null default 'mocked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  source text not null,
  load_number text not null,
  customer_name text not null,
  broker_name text,
  pickup_city text not null,
  delivery_city text not null,
  pickup_window text,
  delivery_window text,
  rate numeric(12,2) not null default 0,
  miles numeric(10,2) not null default 0,
  equipment text,
  stage text not null default 'Needs appointment',
  risk text not null default 'low',
  tracking_status text,
  pod_status text,
  invoice_status text,
  assigned_driver_id uuid references drivers(id) on delete set null,
  assigned_truck_id uuid references trucks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_loads_carrier_load_number
  on loads(carrier_id, load_number);

create table if not exists load_stops (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid not null references loads(id) on delete cascade,
  stop_type text not null,
  sequence_number int not null,
  city text not null,
  scheduled_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists load_events (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid not null references loads(id) on delete cascade,
  event_type text not null,
  event_time timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid not null references loads(id) on delete cascade,
  appointment_type text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending',
  external_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  subject text not null,
  sender text,
  snippet text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  email_thread_id uuid references email_threads(id) on delete set null,
  direction text not null,
  channel text not null default 'email',
  sender text,
  recipient text,
  subject text,
  body text not null,
  sent_at timestamptz not null default now()
);

create table if not exists gps_pings (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  truck_id uuid references trucks(id) on delete set null,
  provider text,
  latitude double precision,
  longitude double precision,
  speed_mph numeric(6,2),
  ping_time timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  invoice_id uuid,
  document_type text not null,
  storage_path text not null,
  status text not null default 'uploaded',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  invoice_number text not null,
  customer_name text not null,
  subtotal numeric(12,2) not null default 0,
  accessorials numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'Draft',
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_invoices_carrier_invoice_number
  on invoices(carrier_id, invoice_number);

create table if not exists rmi_scores (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  score int not null,
  score_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists rmi_events (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  event text not null,
  impact int not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  carrier_id text not null references carriers(id) on delete cascade,
  actor_id text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Manual workflow tables mirror the current frontend flow.
create table if not exists manual_loads (
  id text primary key,
  carrier_id text not null references carriers(id) on delete cascade,
  load_number text not null,
  customer_name text not null,
  pickup_city text not null,
  delivery_city text not null,
  pickup_date date not null,
  delivery_date date not null,
  rate numeric(12,2) not null default 0,
  estimated_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists manual_tasks (
  id text primary key,
  carrier_id text not null references carriers(id) on delete cascade,
  load_id text not null references manual_loads(id) on delete cascade,
  load_number text not null,
  title text not null,
  due_date date not null,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create table if not exists manual_invoices (
  id text primary key,
  carrier_id text not null references carriers(id) on delete cascade,
  load_id text not null references manual_loads(id) on delete cascade,
  load_number text not null,
  customer_name text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'Draft',
  created_at timestamptz not null default now()
);

create index if not exists idx_manual_loads_carrier on manual_loads(carrier_id);
create index if not exists idx_manual_tasks_carrier on manual_tasks(carrier_id, status);
create index if not exists idx_manual_invoices_carrier on manual_invoices(carrier_id, status);
