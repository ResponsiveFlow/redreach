-- Correzione: il contatore dei coloni era tornato a 0 con un colono già registrato (#1).
-- La registrazione provava ad assegnare di nuovo il numero 1, il vincolo di unicità la rifiutava
-- e l'errore veniva scambiato per "slot occupato".
--
-- 1. Riallinea il contatore al numero più alto già assegnato.
-- 2. La registrazione non si fida più del solo contatore: parte sempre dal massimo esistente.
-- 3. Gli errori di unicità si distinguono per vincolo: nome già preso e slot occupato restano
--    quelli di prima, qualunque altro errore non viene più mascherato da "slot_taken".

update public.app_counters
   set value = greatest(value, (select coalesce(max(colonist_number), 0) from public.colonists))
 where key = 'colonist';

create or replace function public.complete_registration(
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
  v_constraint text;
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

  -- Numero colono: sempre sopra il massimo già assegnato, anche se il contatore fosse indietro.
  update public.app_counters
     set value = greatest(value, (select coalesce(max(colonist_number), 0) from public.colonists)) + 1
   where key = 'colonist'
   returning value into v_number;

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
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'colonists_name_key' then
        raise exception 'name_taken';
      elsif v_constraint = 'colonists_sector_id_q_r_key' then
        raise exception 'slot_taken';
      end if;
      raise; -- qualsiasi altro errore reale: non lo travestiamo da "slot occupato"
  end;

  delete from public.slot_holds
    where session_id = p_session or (sector_id = p_sector and q = p_q and r = p_r);

  perform public.maybe_open_next_sector(v_sector.zone);
  return v_colonist;
end $$;
