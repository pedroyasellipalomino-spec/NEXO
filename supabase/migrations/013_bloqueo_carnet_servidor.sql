-- Nexo · Bloqueo del carnet en el servidor (19/11/2026).
-- Un estudiante sin el carnet verificado para el trimestre en curso no puede, aunque se salte la pantalla:
-- cambiar sus facturas ni sus materias (estado de cuenta), ni su plan o vehículo (estacionamiento), ni anotar
-- pagos de materias o estacionamiento. Comida, canchas, recargas del wallet y soporte siguen funcionando.

-- ¿Quien llama puede usar el estado de cuenta y el estacionamiento? Personal activo y cuentas sin carnet: sí.
create or replace function public.carnet_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.my_role() <> 'estudiante' or p.carnet is null
                          or (p.carnet_status = 'ok' and p.carnet_trim = public.current_trim())
                   from public.profiles p where p.id = auth.uid()), false)
$$;
revoke all on function public.carnet_ok() from public, anon;
grant execute on function public.carnet_ok() to authenticated;

create or replace function public.save_my_state(p_pagos jsonb, p_pendrec jsonb, p_moves jsonb, p_materias jsonb default null, p_park jsonb default null)
returns public.student_state language plpgsql security definer set search_path = public as $$
declare s public.student_state; pg jsonb; pr jsonb; mv jsonb; k text; v jsonb; ok boolean := public.carnet_ok();
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if jsonb_typeof(coalesce(p_pagos, '{}')) <> 'object' or jsonb_typeof(coalesce(p_pendrec, '[]')) <> 'array' or jsonb_typeof(coalesce(p_moves, '[]')) <> 'array' then raise exception 'Datos inválidos'; end if;
  if octet_length(coalesce(p_pagos,'{}')::text) + octet_length(coalesce(p_pendrec,'[]')::text) + octet_length(coalesce(p_moves,'[]')::text) + octet_length(coalesce(p_park,'{}')::text) > 400000 then raise exception 'Demasiados datos'; end if;
  insert into public.student_state (user_id) values (auth.uid()) on conflict do nothing;
  select * into s from public.student_state where user_id = auth.uid() for update;

  pg := coalesce(p_pagos, '{}');
  for k, v in select * from jsonb_each(s.pagos) loop
    if not pg ? k then
      if v->>'estado' <> 'externa' then pg := pg || jsonb_build_object(k, v); end if;
    elsif (v ? 'validatedAt' or v ? 'rejectedAt') and pg->k->>'estado' = 'revision'
          and coalesce(pg->k->>'sentAt', '') = coalesce(v->>'sentAt', '') then
      pg := pg || jsonb_build_object(k, v);
    end if;
  end loop;

  select coalesce(jsonb_agg(x order by ord), '[]') into pr from (
    select case when old.r is not null and old.r->>'estado' <> 'revision' and new_.r->>'estado' = 'revision' then old.r else new_.r end x, new_.ord
    from jsonb_array_elements(coalesce(p_pendrec, '[]')) with ordinality new_(r, ord)
    left join lateral (select r from jsonb_array_elements(s.pendrec) o(r) where o.r->>'id' = new_.r->>'id' limit 1) old on true
  ) t;
  select pr || coalesce(jsonb_agg(o.r), '[]') into pr from jsonb_array_elements(s.pendrec) o(r)
    where not exists (select 1 from jsonb_array_elements(pr) n(r) where n.r->>'id' = o.r->>'id');

  select coalesce(jsonb_agg(x order by ord), '[]') into mv from (
    select case when old.m is not null and old.m->>'pill' <> 'En revisión' and new_.m->>'pill' = 'En revisión' then old.m else new_.m end x, new_.ord
    from jsonb_array_elements(coalesce(p_moves, '[]')) with ordinality new_(m, ord)
    left join lateral (select m from jsonb_array_elements(s.moves) o(m) where o.m->>'id' = new_.m->>'id' limit 1) old on true
  ) t;
  select mv || coalesce(jsonb_agg(o.m), '[]') into mv from jsonb_array_elements(s.moves) o(m)
    where not exists (select 1 from jsonb_array_elements(mv) n(m) where n.m->>'id' = o.m->>'id');

  -- carnet sin verificar este trimestre: el estado de cuenta (facturas, materias) y el estacionamiento no cambian
  if not ok then pg := s.pagos; end if;
  update public.student_state set pagos = pg, pendrec = pr, moves = mv,
    materias = case when ok then coalesce(p_materias, materias) else materias end,
    plan = case when ok and p_park ? 'plan' then nullif(p_park->'plan', 'null'::jsonb) else plan end,
    vehicle = case when ok and p_park ? 'vehicle' then nullif(p_park->'vehicle', 'null'::jsonb) else vehicle end,
    updated_at = now()
  where user_id = auth.uid() returning * into s;
  return s;
end $$;
revoke all on function public.save_my_state(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_my_state(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Pagos del dueño: materias y estacionamiento solo con el carnet verificado
drop policy if exists "anotar mis pagos" on public.payments;
create policy "anotar mis pagos" on public.payments for insert to authenticated
  with check (user_id = auth.uid() and (service not in ('materias','estacionamiento') or public.carnet_ok()));
