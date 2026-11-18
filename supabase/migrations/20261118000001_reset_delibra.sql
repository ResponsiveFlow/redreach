-- Red Reach riusa il progetto Supabase che era di Delibra.
-- Questa migrazione elimina TUTTO ciò che era di Delibra (confermato: nessun dato da tenere).

drop view if exists public.nation_stats cascade;
drop view if exists public.capital_standings cascade;

drop function if exists public.complete_registration(public.nation_t, text, text, text, text, text) cascade;
drop function if exists public.search_comuni(public.nation_t, text) cascade;
drop function if exists public.cast_capital_vote(text) cascade;
drop function if exists public.my_invite_count() cascade;
drop function if exists public.center_lots(integer) cascade;
drop function if exists public.cfg(text) cascade;
drop function if exists public.profiles_immutable() cascade;
drop function if exists public.capital_votes_no_update() cascade;

drop table if exists public.capital_votes cascade;
drop table if exists public.profiles cascade;
drop table if exists public.capital_candidates cascade;
drop table if exists public.comuni cascade;
drop table if exists public.provinces cascade;
drop table if exists public.counters cascade;
drop table if exists public.app_config cascade;

drop type if exists public.nation_t cascade;
drop type if exists public.zone_t cascade;

-- Utenti di test di Delibra (i profili sono già spariti con le tabelle).
delete from auth.users;
