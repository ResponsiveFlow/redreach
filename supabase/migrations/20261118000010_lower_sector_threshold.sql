-- Soglia di apertura di un nuovo settore: 25% degli slot occupati (prima 70%).
-- Modificabile da /admin (app_config).
update public.app_config
   set value = 0.25, updated_at = now()
 where key = 'sector_fill_threshold';

-- Nella vista di Marte "pieno" vuol dire "vicino alla soglia di apertura del settore successivo",
-- non "tutti gli slot occupati": con una soglia bassa i settori restavano sempre scuri.
-- Sempre una frazione 0-1 arrotondata, mai i numeri veri.
create or replace view public.sector_stats as
select
  s.id as sector_id,
  s.zone,
  s.index,
  round(
    least(
      1,
      count(c.id)::numeric
        / nullif(
            (s.cols * s.rows - jsonb_array_length(s.deposits))
              * (select value from public.app_config where key = 'sector_fill_threshold'),
            0
          )
    ),
    2
  ) as fill
from public.sectors s
left join public.colonists c on c.sector_id = s.id
where s.is_open
group by s.id;
