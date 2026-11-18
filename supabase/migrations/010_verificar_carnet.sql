-- Nexo · Verificación de carnet por foto.
-- Los carnets de la Unimet pueden tener menos de 11 dígitos. Si el carnet tiene 11, la cuenta entra directo;
-- si tiene menos (5 a 10), la persona envía una foto de su carnet y un administrador (o el creador, o el dueño)
-- la aprueba o la rechaza con un motivo. Mientras tanto la app solo le deja ver la verificación, su cuenta y soporte.
-- Estados: ok · foto (falta enviar la foto) · pendiente (en revisión) · rechazado (con motivo; puede reenviar).

alter table public.profiles add column if not exists carnet_status text not null default 'ok';
alter table public.profiles drop constraint if exists profiles_carnet_status_check;
alter table public.profiles add constraint profiles_carnet_status_check check (carnet_status in ('ok','foto','pendiente','rechazado'));
alter table public.profiles add column if not exists carnet_photo text;
alter table public.profiles add column if not exists carnet_reason text;
alter table public.profiles add column if not exists carnet_sent_at timestamptz;
alter table public.profiles add column if not exists carnet_by text;
alter table public.profiles add column if not exists carnet_decided_at timestamptz;

-- Al crear el usuario: carnet de 11 dígitos → verificado; de 5 a 10 → pide foto. Más de 11 se recorta.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text := left(nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'carnet', ''), '\D', '', 'g'), ''), 11);
begin
  insert into public.profiles (id, email, full_name, carnet, role, carnet_status)
  values (
    new.id, lower(new.email),
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
    c,
    case when encode(extensions.digest(lower(new.email), 'sha256'), 'hex') = '0f39373b257a2943c5a75723fbf9acedf700e2c245db92d672002b6b533b4e83' then 'owner' else 'estudiante' end,
    case when c is not null and length(c) < 11 then 'foto' else 'ok' end
  );
  return new;
end $$;

-- Nadie cambia su propio rol, estado, correo, carnet, local ni la verificación del carnet (solo con las funciones)
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('nexo.role_change', true) = 'on' then return new; end if;
  if new.role is distinct from old.role or new.disabled is distinct from old.disabled or new.local_id is distinct from old.local_id
     or new.email is distinct from old.email or new.carnet is distinct from old.carnet or new.id is distinct from old.id
     or new.carnet_status is distinct from old.carnet_status or new.carnet_photo is distinct from old.carnet_photo
     or new.carnet_reason is distinct from old.carnet_reason or new.carnet_sent_at is distinct from old.carnet_sent_at
     or new.carnet_by is distinct from old.carnet_by or new.carnet_decided_at is distinct from old.carnet_decided_at then
    raise exception 'No puedes cambiar esos datos de la cuenta';
  end if;
  return new;
end $$;

-- El estudiante envía (o reenvía) la foto que ya subió a su carpeta del depósito "carnets"
create or replace function public.submit_carnet(p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select carnet_status into st from public.profiles where id = auth.uid();
  if st is null then raise exception 'Usuario no encontrado'; end if;
  if st = 'ok' then raise exception 'Tu carnet ya está verificado'; end if;
  if coalesce(p_path, '') = '' or split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Foto no válida'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'carnets' and name = p_path) then raise exception 'Foto no encontrada'; end if;
  perform set_config('nexo.role_change', 'on', true);
  update public.profiles set carnet_status = 'pendiente', carnet_photo = p_path, carnet_reason = null,
    carnet_sent_at = now(), carnet_by = null, carnet_decided_at = null where id = auth.uid();
end $$;
revoke all on function public.submit_carnet(text) from public, anon;
grant execute on function public.submit_carnet(text) to authenticated;

-- Administración, creador o dueño aprueba o rechaza (con motivo). "Ya revisado" si otra persona se adelantó.
create or replace function public.decide_carnet(target uuid, approve boolean, reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare st text; me text := public.my_role(); who text;
begin
  if me not in ('owner','creator','admin') then raise exception 'Sin permiso'; end if;
  if target = auth.uid() then raise exception 'No puedes verificar tu propia cuenta'; end if;
  select carnet_status into st from public.profiles where id = target;
  if st is null then raise exception 'Usuario no encontrado'; end if;
  if st <> 'pendiente' then raise exception 'Ya revisado'; end if;
  if not approve and char_length(trim(coalesce(reason, ''))) < 3 then raise exception 'Falta el motivo'; end if;
  select coalesce(nullif(full_name, ''), email) into who from public.profiles where id = auth.uid();
  perform set_config('nexo.role_change', 'on', true);
  update public.profiles set carnet_status = case when approve then 'ok' else 'rechazado' end,
    carnet_reason = case when approve then null else left(trim(reason), 200) end,
    carnet_by = who, carnet_decided_at = now() where id = target;
end $$;
revoke all on function public.decide_carnet(uuid, boolean, text) from public, anon;
grant execute on function public.decide_carnet(uuid, boolean, text) to authenticated;

-- Fotos del carnet: depósito privado; cada quien sube a su carpeta <id>/…; las ven la persona y quien verifica
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('carnets', 'carnets', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "subir mi carnet" on storage.objects;
create policy "subir mi carnet" on storage.objects for insert to authenticated
  with check (bucket_id = 'carnets' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ver carnets" on storage.objects;
create policy "ver carnets" on storage.objects for select to authenticated
  using (bucket_id = 'carnets' and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() in ('owner','creator','admin')));

-- En vivo: la persona se entera de la decisión y quien verifica ve llegar las fotos
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
