-- Nexo · Comercio real: agotados, pausa y horario de cada local, compartidos en vivo con todos los estudiantes.
-- Cualquiera puede leerlos (es información pública del local); solo el comercio de ese local o el personal
-- de gestión (dueño, creador, administración) puede cambiarlos.

create table if not exists public.local_state (
  local_id text primary key check (char_length(local_id) between 2 and 40),
  paused boolean not null default false,
  soldout jsonb not null default '[]'::jsonb check (jsonb_typeof(soldout) = 'array' and jsonb_array_length(soldout) <= 200),
  week jsonb check (week is null or (jsonb_typeof(week) = 'array' and jsonb_array_length(week) = 7)),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.local_state enable row level security;

drop policy if exists "ver estado de locales" on public.local_state;
create policy "ver estado de locales" on public.local_state for select to anon, authenticated using (true);
drop policy if exists "crear estado de mi local" on public.local_state;
create policy "crear estado de mi local" on public.local_state for insert to authenticated
  with check (local_id = public.my_local() or public.my_role() in ('owner','creator','admin'));
drop policy if exists "cambiar estado de mi local" on public.local_state;
create policy "cambiar estado de mi local" on public.local_state for update to authenticated
  using (local_id = public.my_local() or public.my_role() in ('owner','creator','admin'))
  with check (local_id = public.my_local() or public.my_role() in ('owner','creator','admin'));

-- quién y cuándo lo cambió lo pone el servidor, no el navegador
create or replace function public.stamp_local_state() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists stamp_local_state on public.local_state;
create trigger stamp_local_state before insert or update on public.local_state for each row execute function public.stamp_local_state();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'local_state') then
    alter publication supabase_realtime add table public.local_state;
  end if;
end $$;
