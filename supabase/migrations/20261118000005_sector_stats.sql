-- Vista pubblica "tutto Marte": riempimento dei settori aperti.
-- Espone SOLO una frazione (0-1, 2 decimali), mai il numero di coloni né di slot.
create view public.sector_stats as
select
  s.id as sector_id,
  s.zone,
  s.index,
  round(
    least(1, count(c.id)::numeric / nullif(s.cols * s.rows - jsonb_array_length(s.deposits), 0)),
    2
  ) as fill
from public.sectors s
left join public.colonists c on c.sector_id = s.id
where s.is_open
group by s.id;

grant select on public.sector_stats to anon, authenticated;
