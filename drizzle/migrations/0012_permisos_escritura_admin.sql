-- Re-establish administrator write permissions without widening access.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.lista_blanca,
  public.recursos,
  public.tarifas,
  public.horario_atencion,
  public.configuracion,
  public.peliculas,
  public.productos
to authenticated;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
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
      and role = _role
  )
$$;

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

alter table public.lista_blanca enable row level security;
alter table public.recursos enable row level security;
alter table public.tarifas enable row level security;
alter table public.horario_atencion enable row level security;
alter table public.configuracion enable row level security;
alter table public.peliculas enable row level security;
alter table public.productos enable row level security;

drop policy if exists "admin escribe lista" on public.lista_blanca;
create policy "admin escribe lista" on public.lista_blanca
  for all to authenticated
  using (public.has_role(auth.uid(), 'ADMINISTRADOR'))
  with check (public.has_role(auth.uid(), 'ADMINISTRADOR'));

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'recursos',
    'tarifas',
    'horario_atencion',
    'configuracion',
    'peliculas',
    'productos'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'admin escribe', tabla);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(auth.uid(), %L::public.app_role)) with check (public.has_role(auth.uid(), %L::public.app_role))',
      'admin escribe',
      tabla,
      'ADMINISTRADOR',
      'ADMINISTRADOR'
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';
