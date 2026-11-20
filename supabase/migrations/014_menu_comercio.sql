-- Nexo · Cada comercio edita su menú (20/11/2026).
-- local_state.menu: null = el menú de ejemplo de la app; si no, la lista de categorías con sus productos
-- ([{ name, items: [{ id, name, desc, price, icon, tag?, opts? }] }]). La misma regla de local_state decide quién
-- la cambia: el comercio de ese local, o dueño/creador/admin. Sin "<" ni ">" para que nadie meta código en los textos.
alter table public.local_state add column if not exists menu jsonb;
alter table public.local_state drop constraint if exists local_state_menu_check;
alter table public.local_state add constraint local_state_menu_check check (
  menu is null or (jsonb_typeof(menu) = 'array' and jsonb_array_length(menu) between 1 and 30
                   and octet_length(menu::text) <= 60000 and menu::text !~ '[<>]'));
