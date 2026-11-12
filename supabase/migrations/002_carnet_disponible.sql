-- Al registrarse: ¿el carnet ya tiene cuenta? (solo responde sí/no; no revela de quién es)
create or replace function public.carnet_available(c text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where carnet = regexp_replace(coalesce(c, ''), '\D', '', 'g'))
$$;
revoke all on function public.carnet_available(text) from public;
grant execute on function public.carnet_available(text) to anon, authenticated;
