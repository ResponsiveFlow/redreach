-- Red Reach — schema. Principio: slot e numerazione vengono assegnati SOLO dal DB
-- (RPC security definer); i client non scrivono mai direttamente nelle tabelle.
--
-- Coordinate: griglia di esagoni "odd-r" (righe dispari spostate a destra).
-- q = colonna (0..cols-1), r = riga (0..rows-1). Le coordinate (zone, settore, q, r)
-- sono stabili: diventeranno i lotti veri al lancio del gioco.

create type public.zone_t as enum ('ice', 'metal', 'sun');

-- ---------------------------------------------------------------- config
-- Modificabile da /admin (service role). Nessuna policy = nessun accesso dal client.
create table public.app_config (
  key text primary key,
  value numeric not null,
  description text,
  updated_at timestamptz not null default now()
);

create table public.app_counters (
  key text primary key,
  value bigint not null default 0
);

-- ---------------------------------------------------------------- settori
create table public.sectors (
  id bigint generated always as identity primary key,
  zone public.zone_t not null,
  index integer not null check (index >= 1),   -- 1, 2, 3… dentro la zona
  cols integer not null check (cols between 5 and 200),
  rows integer not null check (rows between 5 and 200),
  is_open boolean not null default true,       -- false = nessun nuovo slot assegnabile
  deposits jsonb not null default '[]',        -- [{"q":12,"r":20}, …] (1-3 giacimenti)
  created_at timestamptz not null default now(),
  unique (zone, index)
);

-- ---------------------------------------------------------------- coloni
create table public.colonists (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  colonist_name text check (colonist_name ~ '^[A-Za-z0-9_.-]{3,20}$'),  -- null = "Colonist #N"
  zone public.zone_t not null,
  sector_id bigint not null references public.sectors (id),
  q integer not null check (q >= 0),
  r integer not null check (r >= 0),
  colonist_number bigint not null unique,
  ig_username text,                    -- NON verificato (ManyChat)
  tiktok_username text,
  ref_code text not null unique,
  referred_by uuid references public.colonists (id) on delete set null,
  source text not null default 'altro' check (source in ('ig', 'tt', 'ref', 'altro')),
  lang text not null default 'en' check (lang in ('it', 'en')),
  created_at timestamptz not null default now(),
  unique (sector_id, q, r)             -- niente doppie prenotazioni
);
create unique index colonists_name_key on public.colonists (lower(colonist_name))
  where colonist_name is not null;
create index colonists_created_idx on public.colonists (created_at);
create index colonists_referred_by_idx on public.colonists (referred_by);
create index colonists_zone_idx on public.colonists (zone);

-- ---------------------------------------------------------------- blocchi temporanei
-- Chi tocca uno slot lo tiene bloccato per `hold_minutes` mentre si registra.
-- `session_id` è un token casuale generato dal browser (anche prima del login).
create table public.slot_holds (
  sector_id bigint not null references public.sectors (id),
  zone public.zone_t not null,
  q integer not null,
  r integer not null,
  session_id text not null check (length(session_id) between 16 and 64),
  expires_at timestamptz not null,
  primary key (sector_id, q, r)
);
create index slot_holds_session_idx on public.slot_holds (session_id);

-- ---------------------------------------------------------------- visite (per la conversione in admin)
-- Una riga per visitatore al giorno. Nessun dato personale: id casuale del browser.
create table public.visits (
  visitor_id text not null check (length(visitor_id) between 16 and 64),
  day date not null default current_date,
  source text not null default 'altro' check (source in ('ig', 'tt', 'ref', 'altro')),
  lang text not null default 'en' check (lang in ('it', 'en')),
  primary key (visitor_id, day)
);
create index visits_day_idx on public.visits (day);

-- ---------------------------------------------------------------- RLS
alter table public.app_config enable row level security;
alter table public.app_counters enable row level security;
alter table public.sectors enable row level security;
alter table public.colonists enable row level security;
alter table public.slot_holds enable row level security;
alter table public.visits enable row level security;

-- Ognuno LEGGE solo il proprio profilo. Nessuna policy di insert/update/delete.
create policy colonists_select_own on public.colonists
  for select to authenticated using (id = auth.uid());
-- Settori e giacimenti sono pubblici (servono a disegnare la mappa).
create policy sectors_read on public.sectors
  for select to anon, authenticated using (true);

-- Difesa in profondità: nessuna scrittura ai ruoli client.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
grant select on public.colonists to authenticated;
grant select on public.sectors to anon, authenticated;
