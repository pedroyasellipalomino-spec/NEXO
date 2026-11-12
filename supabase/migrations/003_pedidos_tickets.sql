-- Nexo · Etapa 2: pedidos de comida y tickets de soporte compartidos en vivo
-- Cada pedido/ticket guarda su contenido en `data` (el mismo objeto que usa la app) y columnas para las reglas.

create or replace function public.my_local() returns text
language sql stable security definer set search_path = public as $$
  select case when p.disabled or p.role <> 'local' then null else p.local_id end from public.profiles p where p.id = auth.uid()
$$;

-- Pedidos
create table if not exists public.orders (
  id text primary key check (char_length(id) between 3 and 40),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_id text not null check (char_length(local_id) <= 40),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_local_idx on public.orders (local_id, created_at desc);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
alter table public.orders enable row level security;
drop policy if exists "ver pedidos" on public.orders;
create policy "ver pedidos" on public.orders for select to authenticated
  using (user_id = auth.uid() or local_id = public.my_local() or public.my_role() in ('owner','creator','admin'));
drop policy if exists "crear mis pedidos" on public.orders;
create policy "crear mis pedidos" on public.orders for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "actualizar pedidos" on public.orders;
create policy "actualizar pedidos" on public.orders for update to authenticated
  using (user_id = auth.uid() or local_id = public.my_local() or public.my_role() in ('owner','creator','admin'))
  with check (user_id = auth.uid() or local_id = public.my_local() or public.my_role() in ('owner','creator','admin'));

-- Tickets de soporte
create table if not exists public.tickets (
  id text primary key check (char_length(id) between 3 and 20),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_user_idx on public.tickets (user_id, created_at desc);
alter table public.tickets enable row level security;
drop policy if exists "ver tickets" on public.tickets;
create policy "ver tickets" on public.tickets for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('mod','admin','creator','owner'));
drop policy if exists "crear mis tickets" on public.tickets;
create policy "crear mis tickets" on public.tickets for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "actualizar tickets" on public.tickets;
create policy "actualizar tickets" on public.tickets for update to authenticated
  using (user_id = auth.uid() or public.my_role() in ('mod','admin','creator','owner'))
  with check (user_id = auth.uid() or public.my_role() in ('mod','admin','creator','owner'));

-- No se cambia de dueño un pedido o ticket, ni de local un pedido; updated_at automático
create or replace function public.keep_owner_cols() returns trigger
language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id or new.id is distinct from old.id then raise exception 'No se puede cambiar el dueño'; end if;
  if tg_table_name = 'orders' and new.local_id is distinct from old.local_id then raise exception 'No se puede cambiar el local'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists orders_keep on public.orders;
create trigger orders_keep before update on public.orders for each row execute function public.keep_owner_cols();
drop trigger if exists tickets_keep on public.tickets;
create trigger tickets_keep before update on public.tickets for each row execute function public.keep_owner_cols();

-- En vivo (Realtime respeta las reglas de arriba)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then alter publication supabase_realtime add table public.orders; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tickets') then alter publication supabase_realtime add table public.tickets; end if;
end $$;

-- El resumen del dueño suma pedidos y tickets
create or replace function public.owner_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if public.my_role() <> 'owner' then raise exception 'Solo el dueño'; end if;
  select json_build_object(
    'now', now(),
    'since', (select min(created_at) from public.profiles),
    'users', json_build_object(
      'total', (select count(*) from public.profiles where role <> 'owner'),
      'today', (select count(*) from public.profiles where role <> 'owner' and created_at > now() - interval '1 day'),
      'last7', (select count(*) from public.profiles where role <> 'owner' and created_at > now() - interval '7 days'),
      'confirmed', (select count(*) from public.profiles p join auth.users u on u.id = p.id where p.role <> 'owner' and u.email_confirmed_at is not null),
      'byRole', (select coalesce(json_object_agg(role, n), '{}') from (select role, count(*) n from public.profiles group by role) x)),
    'payments', json_build_object(
      'count', (select count(*) from public.payments where service <> 'recarga' and status in ('Pagado','Acreditada','Aprobado')),
      'usd', (select coalesce(sum(amount), 0) from public.payments where service <> 'recarga' and status in ('Pagado','Acreditada','Aprobado')),
      'review', (select count(*) from public.payments where service <> 'recarga' and status = 'En revisión'),
      'reviewUsd', (select coalesce(sum(amount), 0) from public.payments where service <> 'recarga' and status = 'En revisión'),
      'payers', (select count(distinct user_id) from public.payments where service <> 'recarga')),
    'byService', (select coalesce(json_object_agg(service, json_build_object('n', n, 'usd', usd, 'rev', rev, 'revUsd', rev_usd)), '{}') from (
      select service,
        count(*) filter (where status in ('Pagado','Acreditada','Aprobado')) n,
        coalesce(sum(amount) filter (where status in ('Pagado','Acreditada','Aprobado')), 0) usd,
        count(*) filter (where status = 'En revisión') rev,
        coalesce(sum(amount) filter (where status = 'En revisión'), 0) rev_usd
      from public.payments group by service) s),
    'orders', json_build_object(
      'total', (select count(*) from public.orders),
      'active', (select count(*) from public.orders where data->>'pickedAt' is null and data->>'cancelledAt' is null),
      'delivered', (select count(*) from public.orders where data->>'pickedAt' is not null),
      'cancelled', (select count(*) from public.orders where data->>'cancelledAt' is not null),
      'byLocal', (select coalesce(json_object_agg(local_id, n), '{}') from (select local_id, count(*) n from public.orders group by local_id) x)),
    'tickets', json_build_object(
      'open', (select count(*) from public.tickets where coalesce(data->>'status', 'abierto') <> 'resuelto'),
      'unassigned', (select count(*) from public.tickets where coalesce(data->>'status', 'abierto') <> 'resuelto' and data->>'mod' is null),
      'resolved', (select count(*) from public.tickets where data->>'status' = 'resuelto')),
    'recent', (select coalesce(json_agg(x), '[]') from (
      select p.created_at as t, p.service, p.amount, p.status, p.method, pr.full_name as who
      from public.payments p join public.profiles pr on pr.id = p.user_id order by p.created_at desc limit 30) x),
    'legacy', (select row_to_json(l) from public.legacy_counter l where id = 1)
  ) into r;
  return r;
end $$;
