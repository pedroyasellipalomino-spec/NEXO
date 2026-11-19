-- Nexo · Verificación de carnet para todos, cada trimestre (19/11/2026, decisión del dueño).
-- Todo estudiante con carnet envía una foto (sin importar cuántos dígitos tenga) y un administrador confirma que
-- está inscrito en el trimestre en curso. La aprobación vale solo para ese trimestre (carnet_trim): al empezar el
-- siguiente, la app vuelve a pedir la foto. Trimestres de la Unimet: ene–mar, abr–jul, sep–nov (diciembre cuenta como sep–nov).

alter table public.profiles add column if not exists carnet_trim text;

create or replace function public.current_trim() returns text
language sql stable set search_path = public as $$
  select extract(year from d)::int || case when extract(month from d) >= 9 then '-sep-nov'
                                           when extract(month from d) <= 3 then '-ene-mar' else '-abr-jul' end
  from (select (now() at time zone 'America/Caracas')::date d) x
$$;
grant execute on function public.current_trim() to anon, authenticated;

-- Al registrarse: todo estudiante con carnet empieza por enviar la foto
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
    case when c is not null then 'foto' else 'ok' end
  );
  return new;
end $$;

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('nexo.role_change', true) = 'on' then return new; end if;
  if new.role is distinct from old.role or new.disabled is distinct from old.disabled or new.local_id is distinct from old.local_id
     or new.email is distinct from old.email or new.carnet is distinct from old.carnet or new.id is distinct from old.id
     or new.carnet_status is distinct from old.carnet_status or new.carnet_photo is distinct from old.carnet_photo
     or new.carnet_reason is distinct from old.carnet_reason or new.carnet_sent_at is distinct from old.carnet_sent_at
     or new.carnet_by is distinct from old.carnet_by or new.carnet_decided_at is distinct from old.carnet_decided_at
     or new.carnet_trim is distinct from old.carnet_trim then
    raise exception 'No puedes cambiar esos datos de la cuenta';
  end if;
  return new;
end $$;

-- Enviar la foto: también cuando la verificación es de un trimestre anterior
create or replace function public.submit_carnet(p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare st text; tr text;
begin
  select carnet_status, carnet_trim into st, tr from public.profiles where id = auth.uid();
  if st is null then raise exception 'Usuario no encontrado'; end if;
  if st = 'ok' and tr = public.current_trim() then raise exception 'Tu carnet ya está verificado'; end if;
  if coalesce(p_path, '') = '' or split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Foto no válida'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'carnets' and name = p_path) then raise exception 'Foto no encontrada'; end if;
  perform set_config('nexo.role_change', 'on', true);
  update public.profiles set carnet_status = 'pendiente', carnet_photo = p_path, carnet_reason = null,
    carnet_sent_at = now(), carnet_by = null, carnet_decided_at = null where id = auth.uid();
end $$;

-- Aprobar deja la verificación válida para el trimestre en curso
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
    carnet_trim = case when approve then public.current_trim() else carnet_trim end,
    carnet_by = who, carnet_decided_at = now() where id = target;
end $$;

-- Los estudiantes que ya existían también verifican este trimestre
select set_config('nexo.role_change', 'on', true);
update public.profiles set carnet_status = 'foto'
where role = 'estudiante' and carnet is not null and carnet_status = 'ok' and carnet_trim is distinct from public.current_trim();
