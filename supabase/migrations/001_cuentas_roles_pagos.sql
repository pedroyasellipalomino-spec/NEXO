-- Nexo · Etapa 1: cuentas, roles y registro de pagos (Supabase)
-- Seguridad: Row Level Security en todas las tablas. Nadie puede darse un rol a sí mismo.
-- El rol "owner" solo se asigna a la huella SHA-256 del correo del dueño (el correo no aparece aquí).

create extension if not exists pgcrypto with schema extensions;

-- Perfiles (uno por usuario de auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  carnet text unique,
  role text not null default 'estudiante' check (role in ('estudiante','local','mod','admin','creator','owner')),
  local_id text,
  disabled boolean not null default false,
  career text, ci text, phone text, birth date, addr text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Rol efectivo de quien llama (una cuenta desactivada vale como estudiante)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select case when p.disabled then 'estudiante' else p.role end from public.profiles p where p.id = auth.uid()
$$;

-- Al crear un usuario se crea su perfil. El rol siempre es estudiante, salvo el dueño (por huella del correo).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, carnet, role)
  values (
    new.id, lower(new.email),
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'carnet', ''), '\D', '', 'g'), ''),
    case when encode(extensions.digest(lower(new.email), 'sha256'), 'hex') = '0f39373b257a2943c5a75723fbf9acedf700e2c245db92d672002b6b533b4e83' then 'owner' else 'estudiante' end
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Nadie cambia su propio rol, estado, correo, carnet ni local (solo con set_user_role)
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('nexo.role_change', true) = 'on' then return new; end if;
  if new.role is distinct from old.role or new.disabled is distinct from old.disabled or new.local_id is distinct from old.local_id
     or new.email is distinct from old.email or new.carnet is distinct from old.carnet or new.id is distinct from old.id then
    raise exception 'No puedes cambiar esos datos de la cuenta';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

drop policy if exists "ver perfiles" on public.profiles;
create policy "ver perfiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() in ('owner','creator','admin','mod'));
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Cambiar rol / desactivar: solo el dueño (y el creador para admin/mod/local). Nunca se asigna "owner".
create or replace function public.set_user_role(target uuid, new_role text, new_local text default null, new_disabled boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare me text := public.my_role(); cur text;
begin
  select role into cur from public.profiles where id = target;
  if cur is null then raise exception 'Usuario no encontrado'; end if;
  if new_role not in ('estudiante','local','mod','admin','creator') then raise exception 'Rol no permitido'; end if;
  if cur = 'owner' then raise exception 'La cuenta de dueño no se puede cambiar'; end if;
  if not (me = 'owner' or (me = 'creator' and new_role in ('estudiante','local','mod','admin') and cur <> 'creator')) then raise exception 'Sin permiso'; end if;
  if new_role = 'local' and coalesce(new_local, '') = '' then raise exception 'Falta el local'; end if;
  perform set_config('nexo.role_change', 'on', true);
  update public.profiles set role = new_role, local_id = case when new_role = 'local' then new_local else null end, disabled = coalesce(new_disabled, false) where id = target;
end $$;
revoke all on function public.set_user_role(uuid, text, text, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, text, text, boolean) to authenticated;

-- Registro de pagos (cada persona anota los suyos; el dueño los ve todos)
create table if not exists public.payments (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  service text not null check (service in ('comida','estacionamiento','materias','canchas','recarga')),
  amount numeric(10,2) not null check (amount > 0 and amount <= 5000),
  status text not null check (status in ('Pagado','En revisión','Acreditada','Aprobado','Rechazado')),
  method text not null default 'otro' check (method in ('tarjeta','transferencia','pago-movil','wallet','otro')),
  detail text check (char_length(detail) <= 120),
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "anotar mis pagos" on public.payments;
create policy "anotar mis pagos" on public.payments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "ver pagos" on public.payments;
create policy "ver pagos" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('owner','creator','admin'));

-- Historial del contador anterior (Netlify), solo informativo
create table if not exists public.legacy_counter (id int primary key default 1, signups int not null, payments int not null, since timestamptz, note text);
alter table public.legacy_counter enable row level security;
drop policy if exists "dueño ve historial" on public.legacy_counter;
create policy "dueño ve historial" on public.legacy_counter for select to authenticated using (public.my_role() = 'owner');

-- Resumen para el dueño (datos reales, en vivo)
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
    'byService', (select coalesce(json_object_agg(service, json_build_object(
        'n', n, 'usd', usd, 'rev', rev, 'revUsd', rev_usd)), '{}') from (
      select service,
        count(*) filter (where status in ('Pagado','Acreditada','Aprobado')) n,
        coalesce(sum(amount) filter (where status in ('Pagado','Acreditada','Aprobado')), 0) usd,
        count(*) filter (where status = 'En revisión') rev,
        coalesce(sum(amount) filter (where status = 'En revisión'), 0) rev_usd
      from public.payments group by service) s),
    'recent', (select coalesce(json_agg(x), '[]') from (
      select p.created_at as t, p.service, p.amount, p.status, p.method, pr.full_name as who
      from public.payments p join public.profiles pr on pr.id = p.user_id order by p.created_at desc limit 30) x),
    'legacy', (select row_to_json(l) from public.legacy_counter l where id = 1)
  ) into r;
  return r;
end $$;
revoke all on function public.owner_stats() from public, anon;
grant execute on function public.owner_stats() to authenticated;
