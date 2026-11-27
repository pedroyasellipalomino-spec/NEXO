-- Nexo · "Pagada fuera de Nexo" validada por Caja (27/11/2026, pedido del dueño).
-- El estudiante que marca un mes como pagado fuera de Nexo adjunta el comprobante: la factura queda en revisión
-- (method = 'externa') y solo Caja la deja como 'externa' (caja_decide). Desde la app ya no se puede marcar 'externa'
-- una factura que no lo estaba; sí se puede quitar (vuelve a quedar por pagar).

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
    select case when old.m is not null and old.m->>'pill' <> 'En revisión' and new_.m->>'pill' = 'En revisión' then old.m
                when old.m is not null and old.m->>'pill' = 'En revisión' and new_.m->>'pill' <> 'En revisión' then old.m else new_.m end x, new_.ord
    from jsonb_array_elements(coalesce(p_moves, '[]')) with ordinality new_(m, ord)
    left join lateral (select m from jsonb_array_elements(s.moves) o(m) where o.m->>'id' = new_.m->>'id' limit 1) old on true
  ) t;
  select mv || coalesce(jsonb_agg(o.m), '[]') into mv from jsonb_array_elements(s.moves) o(m)
    where not exists (select 1 from jsonb_array_elements(mv) n(m) where n.m->>'id' = o.m->>'id');

  -- una factura solo queda "pagada" si ya lo estaba, si la pagó con el wallet o si la aprobó Caja (caja_decide);
  -- "pagada fuera de Nexo" (externa) solo si ya lo estaba o la validó Caja con el comprobante
  for k, v in select * from jsonb_each(pg) loop
    if (v->>'estado' = 'pagada' and coalesce(s.pagos->k->>'estado', '') <> 'pagada' and coalesce(v->>'via', '') <> 'Wallet Nexo')
       or (v->>'estado' = 'externa' and coalesce(s.pagos->k->>'estado', '') <> 'externa') then
      if s.pagos ? k then pg := pg || jsonb_build_object(k, s.pagos->k); else pg := pg - k; end if;
    end if;
  end loop;
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
    it := it || case when ok and it->>'method' = 'externa'
      then jsonb_build_object('estado','externa','via','Fuera de Nexo','validatedAt',now_ms,'validatedBy',me)
      when ok
      then jsonb_build_object('estado','pagada','fecha',fecha,'via',case when it->>'method' = 'tarjeta' then coalesce(it->>'card', 'Tarjeta') when it->>'currency' = 'bs' then 'Transferencia en Bs.' else 'Transferencia' end,'validatedAt',now_ms,'validatedBy',me)
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
