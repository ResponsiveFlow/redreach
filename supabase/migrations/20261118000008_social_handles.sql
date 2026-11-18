-- Username Instagram / TikTok: facoltativi, modificabili dal colono dalla sua pagina.
-- Valori vuoti li cancellano. NON sono verificati e non compaiono mai nelle view pubbliche.
create function public.set_social_handles(p_ig text default null, p_tiktok text default null)
returns public.colonists
language plpgsql security definer set search_path = public as $$
declare
  v_ig text := lower(regexp_replace(btrim(coalesce(p_ig, '')), '^@', ''));
  v_tt text := lower(regexp_replace(btrim(coalesce(p_tiktok, '')), '^@', ''));
  v_row public.colonists;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if v_ig <> '' and v_ig !~ '^[a-z0-9._]{1,30}$' then raise exception 'invalid_handle'; end if;
  if v_tt <> '' and v_tt !~ '^[a-z0-9._]{1,30}$' then raise exception 'invalid_handle'; end if;

  update public.colonists
     set ig_username = nullif(v_ig, ''), tiktok_username = nullif(v_tt, '')
   where id = auth.uid()
   returning * into v_row;
  if not found then
    raise exception 'Complete registration first' using errcode = '22023';
  end if;
  return v_row;
end $$;

revoke all on function public.set_social_handles(text, text) from public, anon;
grant execute on function public.set_social_handles(text, text) to authenticated;
