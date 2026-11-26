-- Habilita las consultas autenticadas del catálogo sin exponer tablas administrativas.
grant usage on schema public to authenticated;
grant select on table
  public.recursos,
  public.tarifas,
  public.horario_atencion,
  public.configuracion,
  public.peliculas,
  public.productos
to authenticated;

create or replace function public.es_personal(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role in ('RECEPCIONISTA', 'ADMINISTRADOR')
  )
$$;

revoke all on function public.es_personal(uuid) from public, anon;
grant execute on function public.es_personal(uuid) to authenticated;

alter table public.recursos enable row level security;
alter table public.tarifas enable row level security;
alter table public.horario_atencion enable row level security;
alter table public.configuracion enable row level security;
alter table public.peliculas enable row level security;
alter table public.productos enable row level security;

drop policy if exists "lectura autenticados" on public.recursos;
drop policy if exists "lectura catálogo autenticados" on public.recursos;
create policy "lectura catálogo autenticados" on public.recursos
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "lectura autenticados" on public.tarifas;
drop policy if exists "lectura catálogo autenticados" on public.tarifas;
create policy "lectura catálogo autenticados" on public.tarifas
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "lectura autenticados" on public.horario_atencion;
drop policy if exists "lectura catálogo autenticados" on public.horario_atencion;
create policy "lectura catálogo autenticados" on public.horario_atencion
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "lectura autenticados" on public.configuracion;
drop policy if exists "lectura usuarios con sesion" on public.configuracion;
drop policy if exists "lectura catálogo autenticados" on public.configuracion;
create policy "lectura catálogo autenticados" on public.configuracion
  for select to authenticated using (auth.uid() is not null and id = 1);

drop policy if exists "cartelera" on public.peliculas;
drop policy if exists "lectura catálogo autenticados" on public.peliculas;
create policy "lectura catálogo autenticados" on public.peliculas
  for select to authenticated using (en_cartelera or public.es_personal(auth.uid()));

drop policy if exists "productos activos" on public.productos;
drop policy if exists "lectura catálogo autenticados" on public.productos;
create policy "lectura catálogo autenticados" on public.productos
  for select to authenticated using (activo or public.es_personal(auth.uid()));
