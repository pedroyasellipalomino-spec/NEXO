-- Nexo · Mis reservas: cancelar una cancha sin cargo hasta 2 horas antes, con reembolso.
-- El pago anotado para el dueño pasa a "Reembolsado" (no cuenta como pago confirmado).

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('Pagado','En revisión','Acreditada','Aprobado','Rechazado','Reembolsado'));

drop function if exists public.cancel_court(uuid);
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
  -- el pago de esa reserva (mismo monto, el más cercano a cuando se reservó) queda reembolsado
  update public.payments set status = 'Reembolsado'
  where id = (select id from public.payments where user_id = b.user_id and service = 'canchas' and status = 'Pagado' and amount = b.price
              order by abs(extract(epoch from created_at - b.created_at)) limit 1);
  return b;
end $$;
revoke all on function public.cancel_court(uuid) from public, anon;
grant execute on function public.cancel_court(uuid) to authenticated;
