-- Nexo · Etapa 3: wallet, facturas universitarias, recargas, comprobantes y Caja en vivo.
-- Cada estudiante con cuenta real tiene una fila en student_state con los mismos objetos que usa la app
-- (pagos, pendrec, moves, materias). Nadie escribe la tabla directamente: todo pasa por funciones que validan.

create table if not exists public.student_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wallet numeric(10,2) not null default 0 check (wallet >= 0),
  pagos jsonb not null default '{}'::jsonb,
  pendrec jsonb not null default '[]'::jsonb,
  moves jsonb not null default '[]'::jsonb,
  materias jsonb,
  updated_at timestamptz not null default now()
);
alter table public.student_state enable row level security;
drop policy if exists "ver estado" on public.student_state;
create policy "ver estado" on public.student_state for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('owner','creator','admin'));
-- sin políticas de insert/update/delete: solo las funciones de abajo (security definer) escriben

-- Vista para Caja: nombre y correo junto al estado (respeta las reglas de student_state y profiles)
create or replace view public.caja_state with (security_invoker = true) as
  select s.user_id, p.full_name, p.email, s.pagos, s.pendrec, s.updated_at
  from public.student_state s join public.profiles p on p.id = s.user_id;

-- Guardar lo del propio estudiante, mezclando con lo que decidió Caja o anotó el personal mientras tanto
create or replace function public.save_my_state(p_pagos jsonb, p_pendrec jsonb, p_moves jsonb, p_materias jsonb default null)
returns public.student_state language plpgsql security definer set search_path = public as $$
declare s public.student_state; pg jsonb; pr jsonb; mv jsonb; k text; v jsonb; e jsonb;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if jsonb_typeof(coalesce(p_pagos, '{}')) <> 'object' or jsonb_typeof(coalesce(p_pendrec, '[]')) <> 'array' or jsonb_typeof(coalesce(p_moves, '[]')) <> 'array' then raise exception 'Datos inválidos'; end if;
  if octet_length(coalesce(p_pagos,'{}')::text) + octet_length(coalesce(p_pendrec,'[]')::text) + octet_length(coalesce(p_moves,'[]')::text) > 400000 then raise exception 'Demasiados datos'; end if;
  insert into public.student_state (user_id) values (auth.uid()) on conflict do nothing;
  select * into s from public.student_state where user_id = auth.uid() for update;

  -- Facturas: manda lo del estudiante, salvo lo que Caja ya decidió sobre el mismo envío.
  -- Una clave que falta solo se borra si era "pagada fuera de Nexo" (externa).
  pg := coalesce(p_pagos, '{}');
  for k, v in select * from jsonb_each(s.pagos) loop
    if not pg ? k then
      if v->>'estado' <> 'externa' then pg := pg || jsonb_build_object(k, v); end if;
    elsif (v ? 'validatedAt' or v ? 'rejectedAt') and pg->k->>'estado' = 'revision'
          and coalesce(pg->k->>'sentAt', '') = coalesce(v->>'sentAt', '') then
      pg := pg || jsonb_build_object(k, v);
    end if;
  end loop;

  -- Recargas por Pago Móvil (por id): nunca se borran; lo decidido por Caja gana sobre "revision"
  select coalesce(jsonb_agg(x order by ord), '[]') into pr from (
    select case when old.r is not null and old.r->>'estado' <> 'revision' and new_.r->>'estado' = 'revision' then old.r else new_.r end x, new_.ord
    from jsonb_array_elements(coalesce(p_pendrec, '[]')) with ordinality new_(r, ord)
    left join lateral (select r from jsonb_array_elements(s.pendrec) o(r) where o.r->>'id' = new_.r->>'id' limit 1) old on true
  ) t;
  select pr || coalesce(jsonb_agg(o.r), '[]') into pr from jsonb_array_elements(s.pendrec) o(r)
    where not exists (select 1 from jsonb_array_elements(pr) n(r) where n.r->>'id' = o.r->>'id');

  -- Movimientos (por id): nunca se borran; un "En revisión" no pisa lo que Caja ya resolvió
  select coalesce(jsonb_agg(x order by ord), '[]') into mv from (
    select case when old.m is not null and old.m->>'pill' <> 'En revisión' and new_.m->>'pill' = 'En revisión' then old.m else new_.m end x, new_.ord
    from jsonb_array_elements(coalesce(p_moves, '[]')) with ordinality new_(m, ord)
    left join lateral (select m from jsonb_array_elements(s.moves) o(m) where o.m->>'id' = new_.m->>'id' limit 1) old on true
  ) t;
  select mv || coalesce(jsonb_agg(o.m), '[]') into mv from jsonb_array_elements(s.moves) o(m)
    where not exists (select 1 from jsonb_array_elements(mv) n(m) where n.m->>'id' = o.m->>'id');

  update public.student_state set pagos = pg, pendrec = pr, moves = mv,
    materias = coalesce(p_materias, materias), updated_at = now()
  where user_id = auth.uid() returning * into s;
  return s;
end $$;

-- Saldo del wallet: solo cambia por diferencias (recarga con tarjeta, pago de plan); nunca queda negativo
create or replace function public.wallet_add(delta numeric) returns numeric
language plpgsql security definer set search_path = public as $$
declare w numeric;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if delta is null or delta = 0 then select wallet into w from public.student_state where user_id = auth.uid(); return coalesce(w, 0); end if;
  if delta > 100 or delta < -1000 then raise exception 'Monto fuera de rango'; end if;
  insert into public.student_state (user_id) values (auth.uid()) on conflict do nothing;
  select wallet into w from public.student_state where user_id = auth.uid() for update;
  if w + delta < 0 then raise exception 'Saldo insuficiente'; end if;
  update public.student_state set wallet = round(wallet + delta, 2), updated_at = now() where user_id = auth.uid() returning wallet into w;
  return w;
end $$;

-- Caja: aprobar o rechazar una factura en revisión o una recarga por Pago Móvil (admin, creador, dueño)
create or replace function public.caja_decide(target uuid, kind text, item_id text, ok boolean, motivo text, fecha text, match text)
returns public.student_state language plpgsql security definer set search_path = public as $$
declare s public.student_state; me text; now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  it jsonb; ref6 text; pill text; cls text; idx int; usd numeric;
begin
  if public.my_role() not in ('owner','creator','admin') then raise exception 'Solo Caja'; end if;
  if not ok and coalesce(trim(motivo), '') = '' then raise exception 'Falta el motivo'; end if;
  select coalesce(full_name, 'Caja') into me from public.profiles where id = auth.uid();
  select * into s from public.student_state where user_id = target for update;
  if not found then raise exception 'No existe'; end if;

  if kind = 'factura' then
    it := s.pagos->item_id;
    if it is null or it->>'estado' <> 'revision' then raise exception 'Ya revisado'; end if;
    it := it || case when ok
      then jsonb_build_object('estado','pagada','fecha',fecha,'via',case when it->>'currency' = 'bs' then 'Transferencia en Bs.' else 'Transferencia' end,'validatedAt',now_ms,'validatedBy',me)
      else jsonb_build_object('estado','rechazada','motivo',left(motivo,140),'rejectedAt',now_ms,'rejectedBy',me) end;
    s.pagos := s.pagos || jsonb_build_object(item_id, it);
    pill := case when ok then 'Pagado' else 'Rechazado' end; cls := case when ok then 'ok' else 'warn' end;
  elsif kind = 'recarga' then
    select (o.ord - 1)::int, o.r into idx, it from jsonb_array_elements(s.pendrec) with ordinality o(r, ord) where o.r->>'id' = item_id limit 1;
    if it is null or it->>'estado' <> 'revision' then raise exception 'Ya revisado'; end if;
    it := it || case when ok
      then jsonb_build_object('estado','aprobada','validatedAt',now_ms,'validatedBy',me)
      else jsonb_build_object('estado','rechazada','motivo',left(motivo,140),'rejectedAt',now_ms,'rejectedBy',me) end;
    s.pendrec := jsonb_set(s.pendrec, array[idx::text], it);
    usd := (it->>'amount')::numeric;
    if ok then s.wallet := round(s.wallet + usd, 2); end if;
    pill := case when ok then 'Acreditada' else 'Rechazada' end; cls := case when ok then 'ok' else 'warn' end;
  else raise exception 'Tipo inválido';
  end if;

  -- el movimiento "En revisión" más reciente que corresponde (por título y últimos 6 dígitos de la referencia)
  ref6 := right(coalesce(it->>'ref', ''), 6);
  select (o.ord - 1)::int into idx from jsonb_array_elements(s.moves) with ordinality o(m, ord)
    where o.m->>'pill' = 'En revisión' and position(match in o.m->>'title') > 0
      and (ref6 = '' or position(ref6 in coalesce(o.m->>'detail', '')) > 0)
    order by o.ord desc limit 1;
  if idx is not null then
    s.moves := jsonb_set(s.moves, array[idx::text], (s.moves->idx) || jsonb_build_object('pill', pill, 'pillCls', cls));
  end if;

  update public.student_state set pagos = s.pagos, pendrec = s.pendrec, wallet = s.wallet, moves = s.moves, updated_at = now()
    where user_id = target returning * into s;

  -- el pago anotado para el dueño pasa de "En revisión" a su estado final
  update public.payments set status = case when ok then (case when kind = 'recarga' then 'Acreditada' else 'Pagado' end) else 'Rechazado' end
  where id = (select id from public.payments where user_id = target and status = 'En revisión'
                and service = case when kind = 'recarga' then 'recarga' else 'materias' end
                and (kind = 'recarga' or position(match in coalesce(detail, '')) > 0)
              order by created_at desc limit 1);
  return s;
end $$;

-- Reembolsos y cancelaciones: el personal (o el comercio, solo con pedidos de su local) anota el movimiento al estudiante
create or replace function public.push_move(target text, p_move jsonb, p_order text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid; r text := public.my_role();
begin
  if target ~ '^[0-9a-f-]{36}$' then uid := target::uuid; else select id into uid from public.profiles where lower(email) = lower(target); end if;
  if uid is null then return; end if; -- cuenta de prueba local: no está en Supabase
  if not (r in ('owner','creator','admin','mod')
          or (r = 'local' and p_order is not null and exists (select 1 from public.orders o where o.id = p_order and o.user_id = uid and o.local_id = public.my_local()))) then
    raise exception 'Sin permiso';
  end if;
  if jsonb_typeof(p_move) <> 'object' or octet_length(p_move::text) > 2000 then raise exception 'Movimiento inválido'; end if;
  insert into public.student_state (user_id) values (uid) on conflict do nothing;
  update public.student_state set moves = moves || jsonb_build_array(p_move || jsonb_build_object('ext', true)), updated_at = now() where user_id = uid;
end $$;

revoke all on function public.save_my_state(jsonb, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.wallet_add(numeric) from public, anon;
revoke all on function public.caja_decide(uuid, text, text, boolean, text, text, text) from public, anon;
revoke all on function public.push_move(text, jsonb, text) from public, anon;
grant execute on function public.save_my_state(jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.wallet_add(numeric) to authenticated;
grant execute on function public.caja_decide(uuid, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.push_move(text, jsonb, text) to authenticated;
grant select on public.caja_state to authenticated;

-- En vivo: Caja ve los envíos nuevos y el estudiante, las decisiones
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'student_state') then
    alter publication supabase_realtime add table public.student_state;
  end if;
end $$;

-- Comprobantes (PDF/JPG/PNG ≤ 5 MB) en Storage: cada quien sube a su carpeta; Caja los puede ver
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf','image/jpeg','image/png'];
drop policy if exists "subir mis comprobantes" on storage.objects;
create policy "subir mis comprobantes" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ver comprobantes" on storage.objects;
create policy "ver comprobantes" on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() in ('owner','creator','admin')));
