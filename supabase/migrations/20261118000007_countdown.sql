-- Countdown "apertura gameplay" in cima al sito. Si modifica da /admin (service role)
-- aggiornando queste due righe di app_config.
--   countdown_at      = data/ora in secondi epoch UTC
--   countdown_enabled = 1 acceso, 0 spento
-- Default: 25 novembre 2026, mezzanotte italiana (00:00, ora di Roma = UTC+1).
insert into public.app_config (key, value, description) values
  ('countdown_at', extract(epoch from timestamptz '2026-11-25 00:00:00+01'), 'Countdown: data e ora di apertura (epoch, UTC)'),
  ('countdown_enabled', 1, 'Countdown in cima al sito: 1 = acceso, 0 = spento');

-- Vista pubblica: solo queste due informazioni, il resto di app_config resta privato.
create view public.site_countdown as
select to_timestamp(a.value) as ends_at, (e.value = 1) as enabled
from public.app_config a, public.app_config e
where a.key = 'countdown_at' and e.key = 'countdown_enabled';

grant select on public.site_countdown to anon, authenticated;
