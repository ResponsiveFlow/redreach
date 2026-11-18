-- Libera subito lo slot che una sessione aveva bloccato (pulsante "Elimina" nel banner).
-- Il session_id è un token casuale del browser: chi lo conosce è chi ha fatto il blocco.
create function public.release_slot(p_session text) returns void
language sql security definer set search_path = public as $$
  delete from public.slot_holds
  where session_id = p_session
    and length(coalesce(p_session, '')) between 16 and 64
$$;

revoke all on function public.release_slot(text) from public;
grant execute on function public.release_slot(text) to anon, authenticated;
