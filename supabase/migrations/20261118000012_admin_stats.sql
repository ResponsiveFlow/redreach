-- Metriche per la pagina /admin. Solo service role: niente grant a anon/authenticated.
create function public.admin_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'colonists', (select count(*) from colonists),
    'visitors', (select count(distinct visitor_id) from visits),
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'signups', coalesce(c.n, 0), 'visits', coalesce(v.n, 0)) order by d.day desc)
      from (select generate_series(current_date - 29, current_date, '1 day')::date as day) d
      left join (select created_at::date as day, count(*) n from colonists group by 1) c on c.day = d.day
      left join (select day, count(*) n from visits group by 1) v on v.day = d.day
    ), '[]'::jsonb),
    'by_zone', coalesce((select jsonb_object_agg(zone, n) from (select zone, count(*) n from colonists group by 1) x), '{}'::jsonb),
    'by_lang', coalesce((select jsonb_object_agg(lang, n) from (select lang, count(*) n from colonists group by 1) x), '{}'::jsonb),
    'by_source', (
      select coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'visitors', coalesce(v.n, 0), 'colonists', coalesce(c.n, 0)) order by s.source), '[]'::jsonb)
      from (values ('ig'), ('tt'), ('ref'), ('altro')) s(source)
      left join (select source, count(distinct visitor_id) n from visits group by 1) v on v.source = s.source
      left join (select source, count(*) n from colonists group by 1) c on c.source = s.source
    ),
    'top_inviters', coalesce((
      select jsonb_agg(jsonb_build_object('number', number, 'name', name, 'invited', n) order by n desc, number)
      from (
        select i.colonist_number as number, i.colonist_name as name, count(*) n
        from colonists c join colonists i on i.id = c.referred_by
        group by i.id order by count(*) desc, i.colonist_number limit 10
      ) t
    ), '[]'::jsonb),
    'invited_total', (select count(*) from colonists where referred_by is not null)
  )
$$;
revoke all on function public.admin_stats() from public, anon, authenticated;
