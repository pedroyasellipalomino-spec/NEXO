-- Nexo · Etapa 4: reservas de canchas compartidas (sin choques de horario) y plan/vehículo de estacionamiento por cuenta.

-- Reservas de canchas: una sola reserva activa por cancha, día y hora
create table if not exists public.court_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sport text not null check (sport in ('futbol','baloncesto','beisbol','padel','tenis','voleibol')),
  day date not null,
  slot text not null check (slot ~ '^(1[6-9]|2[01]):00$'),
  price numeric(8,2) not null check (price > 0 and price <= 500),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index if not exists court_bookings_libre on public.court_bookings (sport, day, slot) where cancelled_at is null;
create index if not exists court_bookings_user on public.court_bookings (user_id, day);
alter table public.court_bookings enable row level security;
-- cualquiera con sesión ve qué horas están ocupadas (sin nombres: solo el id interno)
drop policy if exists "ver ocupacion" on public.court_bookings;
create policy "ver ocupacion" on public.court_bookings for select to authenticated using (true);
-- se reserva y se cancela solo con las funciones de abajo

create or replace function public.book_court(p_sport text, p_day date, p_slot text, p_price numeric)
returns public.court_bookings language plpgsql security definer set search_path = public as $$
declare b public.court_bookings;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if p_day < (now() at time zone 'America/Caracas')::date then raise exception 'Ese día ya pasó'; end if;
  if p_day > (now() at time zone 'America/Caracas')::date + 14 then raise exception 'Solo puedes reservar hasta 14 días antes'; end if;
  if p_day = (now() at time zone 'America/Caracas')::date and split_part(p_slot, ':', 1)::int <= extract(hour from now() at time zone 'America/Caracas') then raise exception 'Esa hora ya pasó'; end if;
  if (select count(*) from public.court_bookings where user_id = auth.uid() and day = p_day and cancelled_at is null) >= 2 then raise exception 'Máximo 2 reservas por día'; end if;
  begin
    insert into public.court_bookings (user_id, sport, day, slot, price) values (auth.uid(), p_sport, p_day, p_slot, p_price) returning * into b;
  exception when unique_violation then raise exception 'Ese horario ya está reservado';
  end;
  return b;
end $$;

create or replace function public.cancel_court(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.court_bookings set cancelled_at = now()
  where id = p_id and cancelled_at is null and (user_id = auth.uid() or public.my_role() in ('owner','creator','admin'));
  if not found then raise exception 'No se encontró la reserva'; end if;
end $$;

revoke all on function public.book_court(text, date, text, numeric) from public, anon;
revoke all on function public.cancel_court(uuid) from public, anon;
grant execute on function public.book_court(text, date, text, numeric) to authenticated;
grant execute on function public.cancel_court(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'court_bookings') then
    alter publication supabase_realtime add table public.court_bookings;
  end if;
end $$;

-- Estacionamiento: plan y vehículo viajan con el resto del estado del estudiante
alter table public.student_state add column if not exists plan jsonb;
alter table public.student_state add column if not exists vehicle jsonb;

drop function if exists public.save_my_state(jsonb, jsonb, jsonb, jsonb);
create or replace function public.save_my_state(p_pagos jsonb, p_pendrec jsonb, p_moves jsonb, p_materias jsonb default null, p_park jsonb default null)
returns public.student_state language plpgsql security definer set search_path = public as $$
declare s public.student_state; pg jsonb; pr jsonb; mv jsonb; k text; v jsonb;
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

  update public.student_state set pagos = pg, pendrec = pr, moves = mv,
    materias = coalesce(p_materias, materias),
    plan = case when p_park ? 'plan' then nullif(p_park->'plan', 'null'::jsonb) else plan end,
    vehicle = case when p_park ? 'vehicle' then nullif(p_park->'vehicle', 'null'::jsonb) else vehicle end,
    updated_at = now()
  where user_id = auth.uid() returning * into s;
  return s;
end $$;
revoke all on function public.save_my_state(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_my_state(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- El resumen del dueño suma canchas y estacionamiento
create or replace function public.owner_extra() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() <> 'owner' then raise exception 'Solo el dueño'; end if;
  return json_build_object(
    'courts', json_build_object(
      'total', (select count(*) from public.court_bookings where cancelled_at is null),
      'upcoming', (select count(*) from public.court_bookings where cancelled_at is null and day >= (now() at time zone 'America/Caracas')::date),
      'bySport', (select coalesce(json_object_agg(sport, n), '{}') from (select sport, count(*) n from public.court_bookings where cancelled_at is null group by sport) x)),
    'parking', json_build_object(
      'plans', (select count(*) from public.student_state where plan is not null and (plan->>'end')::date >= (now() at time zone 'America/Caracas')::date),
      'vehicles', (select count(*) from public.student_state where vehicle is not null)),
    'wallet', (select coalesce(sum(wallet), 0) from public.student_state));
end $$;
revoke all on function public.owner_extra() from public, anon;
grant execute on function public.owner_extra() to authenticated;
