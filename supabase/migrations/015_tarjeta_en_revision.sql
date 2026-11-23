-- Nexo · Pagos con tarjeta validados por Caja (24/11/2026, pedido del dueño).
-- Ningún pago con tarjeta (ni transferencia) cuenta como pagado hasta que administración, creador o dueño lo apruebe:
--  · El saldo del wallet ya no sube desde la app (wallet_add solo descuenta): las recargas, con tarjeta o Pago Móvil,
--    se suman cuando Caja las aprueba (caja_decide).
--  · Una factura solo queda "pagada" si se pagó con el wallet o la aprobó Caja; un movimiento "En revisión" no se
--    marca desde la app. Las facturas con tarjeta guardan method = 'tarjeta' y la tarjeta en `card`.
--  · public.payments: lo que anota la persona entra "En revisión", salvo lo pagado con el wallet.
--  · Pedidos con tarjeta o transferencia: payStatus = 'revision'; nadie los cambia (ni el local) hasta que Caja decide
--    con order_pay_decide (aprobar → empieza la preparación; rechazar → se cancela).
--  · Canchas con tarjeta: quedan apartadas (pay_status = 'revision'); court_decide aprueba o rechaza (libera la hora).

-- 1) Wallet: solo descuentos desde la app
create or replace function public.wallet_add(delta numeric) returns numeric
language plpgsql security definer set search_path = public as $$
declare w numeric;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if delta is null or delta = 0 then select wallet into w from public.student_state where user_id = auth.uid(); return coalesce(w, 0); end if;
  if delta > 0 then raise exception 'Las recargas se validan en Caja'; end if;
  if delta < -1000 then raise exception 'Monto fuera de rango'; end if;
  insert into public.student_state (user_id) values (auth.uid()) on conflict do nothing;
  select wallet into w from public.student_state where user_id = auth.uid() for update;
  if w + delta < 0 then raise exception 'Saldo insuficiente'; end if;
  update public.student_state set wallet = round(wallet + delta, 2), updated_at = now() where user_id = auth.uid() returning wallet into w;
  return w;
end $$;

-- 2) Facturas y movimientos protegidos
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

  -- una factura solo queda "pagada" si ya lo estaba, si la pagó con el wallet o si la aprobó Caja (caja_decide)
  for k, v in select * from jsonb_each(pg) loop
    if v->>'estado' = 'pagada' and coalesce(s.pagos->k->>'estado', '') <> 'pagada' and coalesce(v->>'via', '') <> 'Wallet Nexo' then
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

-- 3) Caja: la factura aprobada con tarjeta queda "pagada vía <tarjeta>"
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

-- 4) Pagos del dueño: lo que no es wallet entra en revisión
drop policy if exists "anotar mis pagos" on public.payments;
create policy "anotar mis pagos" on public.payments for insert to authenticated
  with check (user_id = auth.uid() and (service not in ('materias','estacionamiento') or public.carnet_ok())
              and (status = 'En revisión' or method = 'wallet'));

-- 5) Pedidos: el pago con tarjeta o transferencia queda en revisión y nadie lo toca hasta que Caja decide
create or replace function public.orders_pay_guard() returns trigger
language plpgsql as $$
declare deciding boolean := coalesce(current_setting('nexo.pay_decide', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if coalesce(new.data->>'method', '') in ('card','transfer') then new.data := new.data || jsonb_build_object('payStatus', 'revision'); end if;
    return new;
  end if;
  if deciding then return new; end if;
  if old.data->>'payStatus' = 'revision' then new.data := old.data; return new; end if;
  if (new.data->'payStatus') is distinct from (old.data->'payStatus') then
    if old.data ? 'payStatus' then new.data := jsonb_set(new.data, '{payStatus}', old.data->'payStatus'); else new.data := new.data - 'payStatus'; end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_pay_guard on public.orders;
create trigger orders_pay_guard before insert or update on public.orders for each row execute function public.orders_pay_guard();

create or replace function public.order_pay_decide(p_id text, ok boolean, motivo text, p_patch jsonb default '{}')
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders; me text; now_ms bigint := (extract(epoch from now()) * 1000)::bigint; patch jsonb; idx int;
begin
  if public.my_role() not in ('owner','creator','admin') then raise exception 'Solo Caja'; end if;
  if not ok and coalesce(trim(motivo), '') = '' then raise exception 'Falta el motivo'; end if;
  select coalesce(full_name, 'Caja') into me from public.profiles where id = auth.uid();
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'No existe'; end if;
  if coalesce(o.data->>'payStatus', '') <> 'revision' then raise exception 'Ya revisado'; end if;
  select coalesce(jsonb_object_agg(k, v), '{}') into patch from jsonb_each(coalesce(p_patch, '{}')) e(k, v)
    where k in ('paidAt','readyAt','prepStart') and jsonb_typeof(v) = 'number';
  patch := patch || case when ok
    then jsonb_build_object('payStatus','ok','payValidatedAt',now_ms,'payValidatedBy',me)
    else jsonb_build_object('payStatus','rechazada','payMotivo',left(motivo,140),'payRejectedAt',now_ms,'payRejectedBy',me,'cancelledAt',now_ms) end;
  perform set_config('nexo.pay_decide', 'on', true);
  update public.orders set data = data || patch where id = p_id returning * into o;
  perform set_config('nexo.pay_decide', 'off', true);
  -- el movimiento del estudiante y el pago del dueño
  select (x.ord - 1)::int into idx from public.student_state s, jsonb_array_elements(s.moves) with ordinality x(m, ord)
    where s.user_id = o.user_id and x.m->>'order' = p_id and x.m->>'pill' = 'En revisión' order by x.ord desc limit 1;
  if idx is not null then
    update public.student_state set moves = jsonb_set(moves, array[idx::text], (moves->idx) || jsonb_build_object('pill', case when ok then 'Pagado' else 'Rechazado' end, 'pillCls', case when ok then 'ok' else 'warn' end)), updated_at = now()
      where user_id = o.user_id;
  end if;
  update public.payments set status = case when ok then 'Pagado' else 'Rechazado' end
  where id = (select id from public.payments where user_id = o.user_id and service = 'comida' and status = 'En revisión'
                and amount = (o.data->>'total')::numeric order by abs(extract(epoch from created_at - o.created_at)) limit 1);
  return o;
end $$;
revoke all on function public.order_pay_decide(text, boolean, text, jsonb) from public, anon;
grant execute on function public.order_pay_decide(text, boolean, text, jsonb) to authenticated;

-- 6) Canchas con tarjeta: apartadas en revisión
alter table public.court_bookings add column if not exists pay_status text not null default 'ok';
alter table public.court_bookings drop constraint if exists court_bookings_pay_status_check;
alter table public.court_bookings add constraint court_bookings_pay_status_check check (pay_status in ('ok','revision','rechazada'));
alter table public.court_bookings add column if not exists pay_decided_at timestamptz;
alter table public.court_bookings add column if not exists pay_decided_by text;
alter table public.court_bookings add column if not exists pay_motivo text;

create or replace function public.book_court(p_sport text, p_day date, p_slot text, p_price numeric, p_method text default 'tarjeta')
returns public.court_bookings language plpgsql security definer set search_path = public as $$
declare b public.court_bookings; w numeric;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if coalesce(p_method, 'tarjeta') not in ('tarjeta','wallet') then raise exception 'Método no válido'; end if;
  if p_price is null or p_price <= 0 or p_price > 500 then raise exception 'Monto fuera de rango'; end if;
  if p_day < (now() at time zone 'America/Caracas')::date then raise exception 'Ese día ya pasó'; end if;
  if p_day > (now() at time zone 'America/Caracas')::date + 14 then raise exception 'Solo puedes reservar hasta 14 días antes'; end if;
  if p_day = (now() at time zone 'America/Caracas')::date and split_part(p_slot, ':', 1)::int <= extract(hour from now() at time zone 'America/Caracas') then raise exception 'Esa hora ya pasó'; end if;
  if (select count(*) from public.court_bookings where user_id = auth.uid() and day = p_day and cancelled_at is null) >= 2 then raise exception 'Máximo 2 reservas por día'; end if;
  if p_method = 'wallet' then
    insert into public.student_state (user_id) values (auth.uid()) on conflict do nothing;
    select wallet into w from public.student_state where user_id = auth.uid() for update;
    if w < p_price then raise exception 'Saldo insuficiente'; end if;
  end if;
  begin
    insert into public.court_bookings (user_id, sport, day, slot, price, paid_with, pay_status) values (auth.uid(), p_sport, p_day, p_slot, p_price, coalesce(p_method, 'tarjeta'), case when coalesce(p_method, 'tarjeta') = 'tarjeta' then 'revision' else 'ok' end) returning * into b;
  exception when unique_violation then raise exception 'Ese horario ya está reservado';
  end;
  if p_method = 'wallet' then
    update public.student_state set wallet = round(wallet - p_price, 2), updated_at = now() where user_id = auth.uid();
  end if;
  return b;
end $$;
revoke all on function public.book_court(text, date, text, numeric, text) from public, anon;
grant execute on function public.book_court(text, date, text, numeric, text) to authenticated;

create or replace function public.cancel_court(p_id uuid) returns public.court_bookings
language plpgsql security definer set search_path = public as $$
declare b public.court_bookings; staff boolean := public.my_role() in ('owner','creator','admin');
  inicio timestamp; ahora timestamp := now() at time zone 'America/Caracas';
begin
  select * into b from public.court_bookings where id = p_id and cancelled_at is null for update;
  if not found or (b.user_id <> auth.uid() and not staff) then raise exception 'No se encontró la reserva'; end if;
  inicio := b.day + (b.slot || ':00')::time;
  if not staff and inicio - ahora < interval '2 hours' then raise exception 'Ya no se puede cancelar: faltan menos de 2 horas'; end if;
  update public.court_bookings set cancelled_at = now(), pay_status = case when pay_status = 'revision' then 'rechazada' else pay_status end where id = p_id returning * into b;
  if b.paid_with = 'wallet' then
    insert into public.student_state (user_id) values (b.user_id) on conflict do nothing;
    update public.student_state set wallet = round(wallet + b.price, 2), updated_at = now() where user_id = b.user_id;
  end if;
  -- el pago de esa reserva (mismo monto, el más cercano a cuando se reservó) queda reembolsado
  update public.payments set status = 'Reembolsado'
  where id = (select id from public.payments where user_id = b.user_id and service = 'canchas' and status in ('Pagado','En revisión') and amount = b.price
              order by abs(extract(epoch from created_at - b.created_at)) limit 1);
  return b;
end $$;

create or replace function public.court_decide(p_id uuid, ok boolean, motivo text)
returns public.court_bookings language plpgsql security definer set search_path = public as $$
declare b public.court_bookings; me text; idx int;
begin
  if public.my_role() not in ('owner','creator','admin') then raise exception 'Solo Caja'; end if;
  if not ok and coalesce(trim(motivo), '') = '' then raise exception 'Falta el motivo'; end if;
  select coalesce(full_name, 'Caja') into me from public.profiles where id = auth.uid();
  select * into b from public.court_bookings where id = p_id for update;
  if not found then raise exception 'No existe'; end if;
  if b.pay_status <> 'revision' or b.cancelled_at is not null then raise exception 'Ya revisado'; end if;
  update public.court_bookings set pay_status = case when ok then 'ok' else 'rechazada' end, pay_decided_at = now(), pay_decided_by = me,
    pay_motivo = case when ok then null else left(motivo, 140) end, cancelled_at = case when ok then null else now() end
    where id = p_id returning * into b;
  select (x.ord - 1)::int into idx from public.student_state s, jsonb_array_elements(s.moves) with ordinality x(m, ord)
    where s.user_id = b.user_id and x.m->>'court' = p_id::text and x.m->>'pill' = 'En revisión' order by x.ord desc limit 1;
  if idx is not null then
    update public.student_state set moves = jsonb_set(moves, array[idx::text], (moves->idx) || jsonb_build_object('pill', case when ok then 'Pagado' else 'Rechazado' end, 'pillCls', case when ok then 'ok' else 'warn' end)), updated_at = now()
      where user_id = b.user_id;
  end if;
  update public.payments set status = case when ok then 'Pagado' else 'Rechazado' end
  where id = (select id from public.payments where user_id = b.user_id and service = 'canchas' and status = 'En revisión' and amount = b.price
              order by abs(extract(epoch from created_at - b.created_at)) limit 1);
  return b;
end $$;
revoke all on function public.court_decide(uuid, boolean, text) from public, anon;
grant execute on function public.court_decide(uuid, boolean, text) to authenticated;

-- 7) Caja: pedidos y canchas por validar (y lo decidido en los últimos 3 días), con nombre y correo
create or replace function public.caja_extra() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() not in ('owner','creator','admin') then raise exception 'Solo Caja'; end if;
  return jsonb_build_object(
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'user_id', o.user_id, 'local_id', o.local_id, 'data', o.data, 'name', p.full_name, 'email', p.email) order by o.created_at desc)
       from public.orders o join public.profiles p on p.id = o.user_id
       where o.data->>'payStatus' = 'revision' or (o.data->>'payStatus' in ('ok','rechazada') and o.updated_at > now() - interval '3 days')), '[]'),
    'courts', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'user_id', b.user_id, 'sport', b.sport, 'day', b.day, 'slot', b.slot, 'price', b.price, 'pay_status', b.pay_status,
         'created_at', b.created_at, 'decided_at', b.pay_decided_at, 'decided_by', b.pay_decided_by, 'motivo', b.pay_motivo, 'name', p.full_name, 'email', p.email) order by b.created_at desc)
       from public.court_bookings b join public.profiles p on p.id = b.user_id
       where b.pay_status = 'revision' and b.cancelled_at is null or (b.pay_decided_at > now() - interval '3 days')), '[]'));
end $$;
revoke all on function public.caja_extra() from public, anon;
grant execute on function public.caja_extra() to authenticated;
