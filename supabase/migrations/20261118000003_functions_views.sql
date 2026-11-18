-- Red Reach — funzioni (RPC) e view pubbliche in sola lettura.

-- ---------------------------------------------------------------- helper
create function public.cfg(p_key text) returns numeric
language sql stable security definer set search_path = public as $$
  select value from public.app_config where key = p_key
$$;

-- Distanza in esagoni tra due celle odd-r. La UI usa la stessa formula.
create function public.hex_distance(q1 int, r1 int, q2 int, r2 int) returns int
language sql immutable as $$
  with c as (
    select (q1 - (r1 - (r1 & 1)) / 2) as x1, r1 as z1,
           (q2 - (r2 - (r2 & 1)) / 2) as x2, r2 as z2
  )
  select greatest(abs(x1 - x2), abs(z1 - z2), abs((x1 + z1) - (x2 + z2)))::int from c
$$;

-- Distanza dal giacimento più vicino di un settore.
create function public.deposit_distance(p_deposits jsonb, p_q int, p_r int) returns int
language sql immutable as $$
  select min(public.hex_distance(p_q, p_r, (d->>'q')::int, (d->>'r')::int))::int
  from jsonb_array_elements(p_deposits) d
$$;

-- ---------------------------------------------------------------- settori
-- Crea il prossimo settore di una zona con 1-3 giacimenti casuali (fissati nel json).
-- Giacimenti lontani dai bordi e tra loro, così la ricchezza ha un senso.
create function public.create_sector(p_zone public.zone_t) returns public.sectors
language plpgsql security definer set search_path = public as $$
declare
  v_cols int := public.cfg('sector_cols')::int;
  v_rows int := public.cfg('sector_rows')::int;
  v_n int := (public.cfg('deposits_min')::int
              + floor(random() * (public.cfg('deposits_max') - public.cfg('deposits_min') + 1)))::int;
  v_margin int := 4;
  v_min_gap int := 8;
  v_deps jsonb := '[]';
  v_tries int := 0;
  v_q int;
  v_r int;
  v_index int;
  v_sector public.sectors;
begin
  perform pg_advisory_xact_lock(hashtext('sector_' || p_zone::text));

  while jsonb_array_length(v_deps) < v_n and v_tries < 500 loop
    v_tries := v_tries + 1;
    v_q := v_margin + floor(random() * (v_cols - 2 * v_margin))::int;
    v_r := v_margin + floor(random() * (v_rows - 2 * v_margin))::int;
    if not exists (
      select 1 from jsonb_array_elements(v_deps) d
      where public.hex_distance(v_q, v_r, (d->>'q')::int, (d->>'r')::int) < v_min_gap
    ) then
      v_deps := v_deps || jsonb_build_object('q', v_q, 'r', v_r);
    end if;
  end loop;
  if jsonb_array_length(v_deps) = 0 then
    v_deps := jsonb_build_array(jsonb_build_object('q', v_cols / 2, 'r', v_rows / 2));
  end if;

  select coalesce(max(index), 0) + 1 into v_index from public.sectors where zone = p_zone;
  insert into public.sectors (zone, index, cols, rows, deposits)
  values (p_zone, v_index, v_cols, v_rows, v_deps)
  returning * into v_sector;
  return v_sector;
end $$;

-- Apre un nuovo settore se l'ultimo della zona ha superato la soglia di riempimento.
create function public.maybe_open_next_sector(p_zone public.zone_t) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_last public.sectors;
  v_slots int;
  v_taken int;
begin
  perform pg_advisory_xact_lock(hashtext('sector_' || p_zone::text));
  select * into v_last from public.sectors where zone = p_zone order by index desc limit 1;
  if not found then
    perform public.create_sector(p_zone);
    return;
  end if;
  v_slots := v_last.cols * v_last.rows - jsonb_array_length(v_last.deposits);
  select count(*) into v_taken from public.colonists where sector_id = v_last.id;
  if v_taken >= v_slots * public.cfg('sector_fill_threshold') then
    perform public.create_sector(p_zone);
  end if;
end $$;

-- Apertura manuale (admin, service role).
create function public.admin_open_sector(p_zone public.zone_t) returns public.sectors
language sql security definer set search_path = public as $$
  select * from public.create_sector(p_zone)
$$;

-- ---------------------------------------------------------------- blocco slot (anche da anonimo)
-- Blocca uno slot per `hold_minutes`. Un solo blocco per sessione: il nuovo sostituisce il vecchio.
-- Errori (il messaggio è un codice che la UI traduce): slot_invalid, slot_taken.
create function public.hold_slot(p_session text, p_sector bigint, p_q int, p_r int)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_sector public.sectors;
  v_until timestamptz := now() + make_interval(mins => public.cfg('hold_minutes')::int);
  v_ok boolean;
begin
  if p_session is null or length(p_session) < 16 or length(p_session) > 64 then
    raise exception 'slot_invalid';
  end if;
  select * into v_sector from public.sectors where id = p_sector and is_open;
  if not found or p_q < 0 or p_q >= v_sector.cols or p_r < 0 or p_r >= v_sector.rows
     or public.deposit_distance(v_sector.deposits, p_q, p_r) = 0 then
    raise exception 'slot_invalid';
  end if;
  if exists (select 1 from public.colonists where sector_id = p_sector and q = p_q and r = p_r) then
    raise exception 'slot_taken';
  end if;

  delete from public.slot_holds where expires_at <= now();
  delete from public.slot_holds where session_id = p_session;   -- un solo blocco per sessione

  -- Race-safe: inserisce, oppure riprende un blocco scaduto o già nostro.
  insert into public.slot_holds as h (sector_id, zone, q, r, session_id, expires_at)
  values (p_sector, v_sector.zone, p_q, p_r, p_session, v_until)
  on conflict (sector_id, q, r) do update
    set session_id = excluded.session_id, expires_at = excluded.expires_at
    where h.expires_at <= now() or h.session_id = excluded.session_id
  returning true into v_ok;
  if v_ok is null then
    raise exception 'slot_taken';
  end if;
  return v_until;
end $$;

-- ---------------------------------------------------------------- registrazione
-- Chiamata dopo la verifica OTP/Google. Atomica: numero colono, slot e codice invito
-- sono assegnati qui. Idempotente (se il profilo esiste lo restituisce).
-- Errori: slot_invalid, slot_taken, invalid_name, name_taken.
create function public.complete_registration(
  p_session text,
  p_sector bigint,
  p_q int,
  p_r int,
  p_name text default null,
  p_source text default 'altro',
  p_ref text default null,
  p_ig text default null,
  p_tiktok text default null,
  p_lang text default 'en'
) returns public.colonists
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_sector public.sectors;
  v_number bigint;
  v_code text;
  v_referrer uuid;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_source text := coalesce(lower(p_source), 'altro');
  v_lang text := case when lower(coalesce(p_lang, '')) = 'it' then 'it' else 'en' end;
  v_ig text := lower(regexp_replace(btrim(coalesce(p_ig, '')), '^@', ''));
  v_tt text := lower(regexp_replace(btrim(coalesce(p_tiktok, '')), '^@', ''));
  v_colonist public.colonists;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_colonist from public.colonists where id = v_uid;
  if found then
    return v_colonist;
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    raise exception 'Missing email' using errcode = '23502';
  end if;

  if v_name is not null and v_name !~ '^[A-Za-z0-9_.-]{3,20}$' then
    raise exception 'invalid_name';
  end if;

  select * into v_sector from public.sectors where id = p_sector and is_open;
  if not found or p_q < 0 or p_q >= v_sector.cols or p_r < 0 or p_r >= v_sector.rows
     or public.deposit_distance(v_sector.deposits, p_q, p_r) = 0 then
    raise exception 'slot_invalid';
  end if;

  -- Lo slot non deve essere tenuto da un'altra sessione (blocco ancora valido).
  if exists (
    select 1 from public.slot_holds
    where sector_id = p_sector and q = p_q and r = p_r
      and expires_at > now() and session_id is distinct from p_session
  ) then
    raise exception 'slot_taken';
  end if;

  if v_source not in ('ig', 'tt', 'ref', 'altro') then v_source := 'altro'; end if;
  if v_ig !~ '^[a-z0-9._]{1,30}$' then v_ig := null; end if;
  if v_tt !~ '^[a-z0-9._]{1,30}$' then v_tt := null; end if;
  if p_ref is not null then
    select id into v_referrer from public.colonists where ref_code = lower(btrim(p_ref));
  end if;

  update public.app_counters set value = value + 1 where key = 'colonist' returning value into v_number;

  loop
    v_code := substr(md5(random()::text || clock_timestamp()::text || v_uid::text), 1, 8);
    exit when not exists (select 1 from public.colonists where ref_code = v_code);
  end loop;

  begin
    insert into public.colonists (
      id, email, colonist_name, zone, sector_id, q, r, colonist_number,
      ig_username, tiktok_username, ref_code, referred_by, source, lang
    ) values (
      v_uid, v_email, v_name, v_sector.zone, p_sector, p_q, p_r, v_number,
      v_ig, v_tt, v_code, v_referrer, v_source, v_lang
    ) returning * into v_colonist;
  exception
    when unique_violation then
      if sqlerrm like '%colonists_name_key%' then
        raise exception 'name_taken';
      end if;
      raise exception 'slot_taken';
  end;

  delete from public.slot_holds
    where session_id = p_session or (sector_id = p_sector and q = p_q and r = p_r);

  perform public.maybe_open_next_sector(v_sector.zone);
  return v_colonist;
end $$;

-- Scelta/cambio del nome da colono (unico, senza distinzione maiuscole/minuscole).
create function public.set_colonist_name(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if v_name !~ '^[A-Za-z0-9_.-]{3,20}$' then
    raise exception 'invalid_name';
  end if;
  begin
    update public.colonists set colonist_name = v_name where id = auth.uid();
  exception when unique_violation then
    raise exception 'name_taken';
  end;
  if not found then
    raise exception 'Complete registration first' using errcode = '22023';
  end if;
  return v_name;
end $$;

-- ---------------------------------------------------------------- inviti
create function public.my_invite_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.colonists where referred_by = auth.uid()
$$;

-- Dal codice invito alla posizione di chi invita ("Land next to me"). Nessun dato personale.
create function public.invite_lookup(p_ref text)
returns table (zone public.zone_t, sector_id bigint, q int, r int, colonist_number bigint, colonist_name text)
language sql stable security definer set search_path = public as $$
  select c.zone, c.sector_id, c.q, c.r, c.colonist_number, c.colonist_name
  from public.colonists c where c.ref_code = lower(btrim(p_ref))
$$;

-- ---------------------------------------------------------------- visite
create function public.log_visit(p_visitor text, p_source text default 'altro', p_lang text default 'en')
returns void
language sql security definer set search_path = public as $$
  insert into public.visits (visitor_id, source, lang)
  select p_visitor,
         case when p_source in ('ig', 'tt', 'ref') then p_source else 'altro' end,
         case when p_lang = 'it' then 'it' else 'en' end
  where length(coalesce(p_visitor, '')) between 16 and 64
  on conflict do nothing
$$;

-- ---------------------------------------------------------------- permessi funzioni
revoke all on function public.cfg(text) from public, anon, authenticated;
revoke all on function public.create_sector(public.zone_t) from public, anon, authenticated;
revoke all on function public.maybe_open_next_sector(public.zone_t) from public, anon, authenticated;
revoke all on function public.admin_open_sector(public.zone_t) from public, anon, authenticated;
revoke all on function public.hold_slot(text, bigint, int, int) from public;
revoke all on function public.complete_registration(text, bigint, int, int, text, text, text, text, text, text) from public, anon;
revoke all on function public.set_colonist_name(text) from public, anon;
revoke all on function public.my_invite_count() from public, anon;
revoke all on function public.invite_lookup(text) from public;
revoke all on function public.log_visit(text, text, text) from public;

grant execute on function public.hold_slot(text, bigint, int, int) to anon, authenticated;
grant execute on function public.invite_lookup(text) to anon, authenticated;
grant execute on function public.log_visit(text, text, text) to anon, authenticated;
grant execute on function public.complete_registration(text, bigint, int, int, text, text, text, text, text, text) to authenticated;
grant execute on function public.set_colonist_name(text) to authenticated;
grant execute on function public.my_invite_count() to authenticated;
-- cfg/create_sector/admin_open_sector: solo service role (admin).

-- ---------------------------------------------------------------- view pubbliche (sola lettura)
-- Girano con i privilegi del proprietario: espongono SOLO queste colonne (mai email o codici).

-- Mappa: slot occupati con il nome del colono (null = "Colonist #N").
create view public.public_slots as
select sector_id, zone, q, r, colonist_number, colonist_name from public.colonists;

-- Slot bloccati al momento (senza il token di sessione).
create view public.public_holds as
select sector_id, q, r from public.slot_holds where expires_at > now();

-- Contatori per zona (tutte e tre, anche a zero).
create view public.zone_stats as
select z.zone, coalesce(c.n, 0)::bigint as colonists
from (values ('ice'::public.zone_t), ('metal'), ('sun')) as z(zone)
left join (select zone, count(*) as n from public.colonists group by zone) c on c.zone = z.zone;

grant select on public.public_slots, public.public_holds, public.zone_stats to anon, authenticated;
