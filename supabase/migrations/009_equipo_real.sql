-- Nexo · Equipo real: activar o desactivar personal sin cambiar su rol.
-- Moderadores: los pueden desactivar o reactivar admin, creador y dueño. Administradores: creador y dueño.
-- Nadie se desactiva a sí mismo ni toca al dueño o al creador por aquí.

create or replace function public.set_staff_active(target uuid, active boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me text := public.my_role(); cur text;
begin
  select role into cur from public.profiles where id = target;
  if cur is null then raise exception 'Usuario no encontrado'; end if;
  if target = auth.uid() then raise exception 'No puedes cambiar tu propia cuenta'; end if;
  if not ((cur = 'mod' and me in ('admin','creator','owner')) or (cur = 'admin' and me in ('creator','owner'))) then
    raise exception 'Sin permiso';
  end if;
  perform set_config('nexo.role_change', 'on', true);
  update public.profiles set disabled = not active where id = target;
end $$;
revoke all on function public.set_staff_active(uuid, boolean) from public, anon;
grant execute on function public.set_staff_active(uuid, boolean) to authenticated;
