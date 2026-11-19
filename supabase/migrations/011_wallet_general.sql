-- Nexo · Wallet general: el saldo sirve para comida, canchas, facturas universitarias y estacionamiento.
-- Canchas: book_court puede cobrar del wallet en la misma operación (si no alcanza, no aparta la hora) y
-- cancel_court devuelve al wallet lo que se pagó con él. Reembolsos del personal o del comercio de algo pagado
-- con wallet: push_move acepta "wallet" (monto a devolver) y lo suma al saldo del estudiante.

alter table public.court_bookings add column if not exists paid_with text not null default 'tarjeta';
alter table public.court_bookings drop constraint if exists court_bookings_paid_with_check;
alter table public.court_bookings add constraint court_bookings_paid_with_check check (paid_with in ('tarjeta','wallet'));

drop function if exists public.book_court(text, date, text, numeric);
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
    insert into public.court_bookings (user_id, sport, day, slot, price, paid_with) values (auth.uid(), p_sport, p_day, p_slot, p_price, coalesce(p_method, 'tarjeta')) returning * into b;
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
  update public.court_bookings set cancelled_at = now() where id = p_id returning * into b;
  if b.paid_with = 'wallet' then
    insert into public.student_state (user_id) values (b.user_id) on conflict do nothing;
    update public.student_state set wallet = round(wallet + b.price, 2), updated_at = now() where user_id = b.user_id;
  end if;
  -- el pago de esa reserva (mismo monto, el más cercano a cuando se reservó) queda reembolsado
  update public.payments set status = 'Reembolsado'
  where id = (select id from public.payments where user_id = b.user_id and service = 'canchas' and status = 'Pagado' and amount = b.price
              order by abs(extract(epoch from created_at - b.created_at)) limit 1);
  return b;
end $$;

-- Reembolsos: si el movimiento trae "wallet" (monto), se devuelve al saldo del estudiante.
-- El comercio solo con pedidos de su local y nunca más que el total del pedido; el personal, hasta $1.000.
create or replace function public.push_move(target text, p_move jsonb, p_order text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid; r text := public.my_role(); back numeric := 0; o_total numeric;
begin
  if target ~ '^[0-9a-f-]{36}$' then uid := target::uuid; else select id into uid from public.profiles where lower(email) = lower(target); end if;
  if uid is null then return; end if; -- cuenta de prueba local: no está en Supabase
  if not (r in ('owner','creator','admin','mod')
          or (r = 'local' and p_order is not null and exists (select 1 from public.orders o where o.id = p_order and o.user_id = uid and o.local_id = public.my_local()))) then
    raise exception 'Sin permiso';
  end if;
  if jsonb_typeof(p_move) <> 'object' or octet_length(p_move::text) > 2000 then raise exception 'Movimiento inválido'; end if;
  if jsonb_typeof(p_move->'wallet') = 'number' then
    back := round((p_move->>'wallet')::numeric, 2);
    if back <= 0 or back > 1000 then raise exception 'Monto fuera de rango'; end if;
    if r = 'local' then
      select (data->>'total')::numeric into o_total from public.orders where id = p_order;
      if o_total is null or back > o_total then raise exception 'Monto fuera de rango'; end if;
      if exists (select 1 from public.student_state s, jsonb_array_elements(s.moves) m
                 where s.user_id = uid and m->>'order' = p_order and jsonb_typeof(m->'wallet') = 'number') then
        raise exception 'Ya reembolsado';
      end if;
    end if;
  end if;
  insert into public.student_state (user_id) values (uid) on conflict do nothing;
  update public.student_state set moves = moves || jsonb_build_array(p_move || jsonb_build_object('ext', true)),
    wallet = round(wallet + back, 2), updated_at = now() where user_id = uid;
end $$;
