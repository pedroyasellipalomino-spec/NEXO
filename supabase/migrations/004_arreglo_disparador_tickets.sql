-- Arreglo: el disparador comparaba local_id también en tickets (que no tiene esa columna) y rechazaba toda actualización.
create or replace function public.keep_owner_cols() returns trigger
language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id or new.id is distinct from old.id then raise exception 'No se puede cambiar el dueño'; end if;
  if tg_table_name = 'orders' then
    if (to_jsonb(new)->>'local_id') is distinct from (to_jsonb(old)->>'local_id') then raise exception 'No se puede cambiar el local'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
