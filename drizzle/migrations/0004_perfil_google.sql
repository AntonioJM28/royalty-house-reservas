-- Permite completar perfiles creados por OAuth y asegura que exista el perfil al ingresar.

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "perfil propio lectura" on public.profiles;
create policy "perfil propio lectura" on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "perfil propio edición" on public.profiles;
create policy "perfil propio edición" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "perfil propio creación" on public.profiles;
create policy "perfil propio creación" on public.profiles for insert to authenticated
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_rol public.app_role;
begin
  insert into public.profiles (id, nombre, correo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    lower(new.email)
  )
  on conflict (id) do nothing;

  select rol into v_rol from public.lista_blanca where correo = lower(new.email);
  insert into public.user_roles (user_id, role) values (new.id, coalesce(v_rol, 'CLIENTE'))
  on conflict do nothing;
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

drop function if exists public.completar_perfil(text);
create function public.completar_perfil(p_telefono text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_nombre text;
  v_correo text;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO';
  end if;

  if p_telefono is null or length(btrim(p_telefono)) < 7 or length(btrim(p_telefono)) > 15 then
    raise exception 'TELEFONO_INVALIDO';
  end if;

  select
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    lower(u.email)
  into v_nombre, v_correo
  from auth.users u
  where u.id = v_uid;

  insert into public.profiles (id, nombre, correo, telefono, acepto_datos)
  values (v_uid, coalesce(v_nombre, 'Cliente'), v_correo, btrim(p_telefono), true)
  on conflict (id) do update
  set nombre = excluded.nombre,
      correo = excluded.correo,
      telefono = excluded.telefono,
      acepto_datos = true
  returning jsonb_build_object(
    'id', id,
    'telefono', telefono,
    'acepto_datos', acepto_datos
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.completar_perfil(text) from public;
grant execute on function public.completar_perfil(text) to authenticated;
