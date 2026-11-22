create type public.app_role as enum ('CLIENTE','RECEPCIONISTA','ADMINISTRADOR');
create type public.tipo_recurso as enum ('MESA_NORMAL','MESA_VIP','SALA_MINICINE');
create type public.estado_reserva as enum ('CONFIRMADA','EN_USO','FINALIZADA','CANCELADA','NO_PRESENTADA');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  correo text not null unique,
  telefono text,
  acepto_datos boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
create table public.lista_blanca (
  correo text primary key,
  rol public.app_role not null check (rol in ('RECEPCIONISTA','ADMINISTRADOR')),
  created_at timestamptz not null default now()
);
create table public.recursos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo public.tipo_recurso not null,
  capacidad int not null check (capacidad > 0),
  activo boolean not null default true
);
create table public.tarifas (
  tipo public.tipo_recurso primary key,
  precio_hora numeric(10,2) not null check (precio_hora >= 0)
);
create table public.horario_atencion (
  id int primary key default 1 check (id = 1),
  hora_apertura time not null,
  hora_cierre time not null check (hora_cierre > hora_apertura)
);
create table public.configuracion (
  id int primary key default 1 check (id = 1),
  horas_min_cancelacion int not null default 2,
  minutos_tolerancia int not null default 15,
  max_reservas_activas int not null default 2,
  max_bloques_billar int not null default 4
);
create table public.peliculas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null unique,
  duracion_min int not null check (duracion_min > 0),
  en_cartelera boolean not null default true
);
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  usuario_id uuid,
  nombre_cliente text not null,
  telefono_cliente text not null,
  recurso_id uuid not null references public.recursos(id),
  pelicula_id uuid references public.peliculas(id),
  fecha date not null,
  hora_inicio time not null,
  bloques int not null check (bloques between 1 and 8),
  estado public.estado_reserva not null default 'CONFIRMADA',
  hora_entrada timestamptz,
  hora_salida timestamptz,
  creada_por uuid,
  creada_en timestamptz not null default now(),
  unique (id, recurso_id, fecha)
);
create table public.reserva_bloques (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null,
  recurso_id uuid not null references public.recursos(id),
  fecha date not null,
  bloque int not null check (bloque between 0 and 23),
  constraint uq_recurso_fecha_bloque unique (recurso_id, fecha, bloque),
  constraint fk_bloque_reserva foreign key (reserva_id, recurso_id, fecha)
    references public.reservas(id, recurso_id, fecha) on delete cascade
);
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  precio numeric(10,2) not null check (precio >= 0),
  existencias int not null default 0 check (existencias >= 0),
  activo boolean not null default true
);
create table public.pedido_candy (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  producto_id uuid not null references public.productos(id),
  cantidad int not null check (cantidad > 0)
);
create table public.consumos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id),
  producto_id uuid not null references public.productos(id),
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  fecha timestamptz not null default now(),
  registrado_por uuid
);
create index on public.reservas (usuario_id, estado);
create index on public.reservas (fecha);
create index on public.consumos (reserva_id);

-- Grants
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.lista_blanca to authenticated;
grant select, insert, update, delete on public.recursos to authenticated;
grant select, insert, update, delete on public.tarifas to authenticated;
grant select, insert, update, delete on public.horario_atencion to authenticated;
grant select, insert, update, delete on public.configuracion to authenticated;
grant select, insert, update, delete on public.peliculas to authenticated;
grant select on public.reservas to authenticated;
grant select on public.reserva_bloques to authenticated;
grant select, insert, update, delete on public.productos to authenticated;
grant select on public.pedido_candy to authenticated;
grant select on public.consumos to authenticated;
grant all on public.profiles, public.user_roles, public.lista_blanca, public.recursos, public.tarifas,
  public.horario_atencion, public.configuracion, public.peliculas, public.reservas, public.reserva_bloques,
  public.productos, public.pedido_candy, public.consumos to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.lista_blanca enable row level security;
alter table public.recursos enable row level security;
alter table public.tarifas enable row level security;
alter table public.horario_atencion enable row level security;
alter table public.configuracion enable row level security;
alter table public.peliculas enable row level security;
alter table public.reservas enable row level security;
alter table public.reserva_bloques enable row level security;
alter table public.productos enable row level security;
alter table public.pedido_candy enable row level security;
alter table public.consumos enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.es_personal(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('RECEPCIONISTA','ADMINISTRADOR'))
$$;

-- Policies
create policy "perfil propio lectura" on public.profiles for select to authenticated
  using (id = auth.uid() or public.es_personal(auth.uid()));
create policy "perfil propio edición" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Prevent changing correo via update: restrict columns
revoke update on public.profiles from authenticated;
grant update (telefono, acepto_datos, nombre) on public.profiles to authenticated;

create policy "roles propios" on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy "admin lee lista" on public.lista_blanca for select to authenticated using (public.has_role(auth.uid(),'ADMINISTRADOR'));
create policy "admin escribe lista" on public.lista_blanca for all to authenticated
  using (public.has_role(auth.uid(),'ADMINISTRADOR')) with check (public.has_role(auth.uid(),'ADMINISTRADOR'));

do $$ declare t text; begin
  foreach t in array array['recursos','tarifas','horario_atencion','configuracion'] loop
    execute format('create policy "lectura autenticados" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "admin escribe" on public.%I for all to authenticated using (public.has_role(auth.uid(),''ADMINISTRADOR'')) with check (public.has_role(auth.uid(),''ADMINISTRADOR''))', t);
  end loop;
end $$;

create policy "cartelera" on public.peliculas for select to authenticated
  using (en_cartelera or public.es_personal(auth.uid()));
create policy "admin escribe" on public.peliculas for all to authenticated
  using (public.has_role(auth.uid(),'ADMINISTRADOR')) with check (public.has_role(auth.uid(),'ADMINISTRADOR'));
create policy "productos activos" on public.productos for select to authenticated
  using (activo or public.es_personal(auth.uid()));
create policy "admin escribe" on public.productos for all to authenticated
  using (public.has_role(auth.uid(),'ADMINISTRADOR')) with check (public.has_role(auth.uid(),'ADMINISTRADOR'));

create policy "reservas propias o personal" on public.reservas for select to authenticated
  using (usuario_id = auth.uid() or public.es_personal(auth.uid()));
create policy "bloques personal" on public.reserva_bloques for select to authenticated
  using (public.es_personal(auth.uid()));
create policy "pedido propio o personal" on public.pedido_candy for select to authenticated
  using (public.es_personal(auth.uid()) or exists (select 1 from public.reservas r where r.id = reserva_id and r.usuario_id = auth.uid()));
create policy "consumo propio o personal" on public.consumos for select to authenticated
  using (public.es_personal(auth.uid()) or exists (select 1 from public.reservas r where r.id = reserva_id and r.usuario_id = auth.uid()));

-- Trigger alta de usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_rol public.app_role;
begin
  insert into public.profiles (id, nombre, correo)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    lower(new.email))
  on conflict (id) do nothing;
  select rol into v_rol from public.lista_blanca where correo = lower(new.email);
  insert into public.user_roles (user_id, role) values (new.id, coalesce(v_rol, 'CLIENTE'))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hora local
create or replace function public.ahora_local() returns timestamp language sql stable as $$
  select (now() at time zone 'America/La_Paz')
$$;

-- RPC: ocupación
create or replace function public.obtener_ocupacion(p_fecha date, p_tipo public.tipo_recurso[])
returns table (recurso_id uuid, bloque int)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NO_AUTENTICADO'; end if;
  return query select b.recurso_id, b.bloque from public.reserva_bloques b
    join public.recursos r on r.id = b.recurso_id
    where b.fecha = p_fecha and r.tipo = any(p_tipo);
end $$;

create or replace function public.generar_codigo() returns text language plpgsql volatile as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; res text := ''; i int;
begin
  for i in 1..8 loop res := res || substr(chars, 1 + floor(random()*length(chars))::int, 1); end loop;
  return res;
end $$;

-- RPC: crear reserva
create or replace function public.crear_reserva(
  p_recurso_id uuid, p_fecha date, p_hora_inicio time, p_bloques int,
  p_pelicula_id uuid default null, p_nombre_cliente text default null, p_telefono_cliente text default null,
  p_productos jsonb default '[]'::jsonb)
returns public.reservas
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_personal boolean;
  v_perfil public.profiles;
  v_cfg public.configuracion;
  v_hor public.horario_atencion;
  v_rec public.recursos;
  v_pel public.peliculas;
  v_res public.reservas;
  v_nombre text; v_tel text; v_usuario uuid;
  v_ini int; v_activas int; i int; v_item jsonb; v_codigo text;
begin
  if v_uid is null then raise exception 'NO_AUTENTICADO'; end if;
  v_personal := public.es_personal(v_uid);
  select * into v_cfg from public.configuracion where id = 1;
  select * into v_hor from public.horario_atencion where id = 1;
  select * into v_rec from public.recursos where id = p_recurso_id and activo;
  if not found then raise exception 'RECURSO_INVALIDO'; end if;

  if v_personal then
    v_nombre := nullif(trim(p_nombre_cliente),''); v_tel := nullif(trim(p_telefono_cliente),'');
    if v_nombre is null or v_tel is null then raise exception 'DATOS_CLIENTE_REQUERIDOS'; end if;
    v_usuario := null;
  else
    select * into v_perfil from public.profiles where id = v_uid;
    if not found or not v_perfil.acepto_datos or v_perfil.telefono is null then raise exception 'PERFIL_INCOMPLETO'; end if;
    v_nombre := v_perfil.nombre; v_tel := v_perfil.telefono; v_usuario := v_uid;
    select count(*) into v_activas from public.reservas
      where usuario_id = v_uid and estado = 'CONFIRMADA' and (fecha + hora_inicio) >= public.ahora_local() - interval '1 hour';
    if v_activas >= v_cfg.max_reservas_activas then raise exception 'MAX_RESERVAS'; end if;
  end if;

  if extract(minute from p_hora_inicio) <> 0 then raise exception 'HORA_INVALIDA'; end if;
  v_ini := extract(hour from p_hora_inicio)::int;
  if (p_fecha + p_hora_inicio) < date_trunc('hour', public.ahora_local()) then raise exception 'HORA_PASADA'; end if;

  if v_rec.tipo = 'SALA_MINICINE' then
    select * into v_pel from public.peliculas where id = p_pelicula_id and en_cartelera;
    if not found then raise exception 'PELICULA_REQUERIDA'; end if;
    if p_bloques <> ceil(v_pel.duracion_min / 60.0)::int then raise exception 'BLOQUES_INVALIDOS'; end if;
  else
    if p_pelicula_id is not null then raise exception 'PELICULA_NO_APLICA'; end if;
    if p_bloques < 1 or p_bloques > v_cfg.max_bloques_billar then raise exception 'BLOQUES_INVALIDOS'; end if;
    if p_productos is not null and jsonb_array_length(p_productos) > 0 then raise exception 'CANDY_SOLO_MINICINE'; end if;
  end if;

  if p_hora_inicio < v_hor.hora_apertura or (p_hora_inicio + make_interval(hours => p_bloques)) > v_hor.hora_cierre
     or v_ini + p_bloques > 24 then
    raise exception 'FUERA_DE_HORARIO';
  end if;

  loop
    v_codigo := public.generar_codigo();
    exit when not exists (select 1 from public.reservas where codigo = v_codigo);
  end loop;

  begin
    insert into public.reservas (codigo, usuario_id, nombre_cliente, telefono_cliente, recurso_id, pelicula_id, fecha, hora_inicio, bloques, creada_por)
    values (v_codigo, v_usuario, v_nombre, v_tel, p_recurso_id, case when v_rec.tipo='SALA_MINICINE' then p_pelicula_id end, p_fecha, p_hora_inicio, p_bloques, v_uid)
    returning * into v_res;
    for i in 0..p_bloques-1 loop
      insert into public.reserva_bloques (reserva_id, recurso_id, fecha, bloque) values (v_res.id, p_recurso_id, p_fecha, v_ini + i);
    end loop;
  exception when unique_violation then
    raise exception 'HORARIO_OCUPADO';
  end;

  if v_rec.tipo = 'SALA_MINICINE' and p_productos is not null then
    for v_item in select * from jsonb_array_elements(p_productos) loop
      if (v_item->>'cantidad')::int > 0 then
        if not exists (select 1 from public.productos where id = (v_item->>'producto_id')::uuid and activo) then
          raise exception 'PRODUCTO_INVALIDO';
        end if;
        insert into public.pedido_candy (reserva_id, producto_id, cantidad)
        values (v_res.id, (v_item->>'producto_id')::uuid, (v_item->>'cantidad')::int);
      end if;
    end loop;
  end if;
  return v_res;
end $$;

create or replace function public.cancelar_reserva(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_res public.reservas; v_cfg public.configuracion; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NO_AUTENTICADO'; end if;
  select * into v_res from public.reservas where id = p_id for update;
  if not found then raise exception 'RESERVA_NO_ENCONTRADA'; end if;
  if v_res.estado <> 'CONFIRMADA' then raise exception 'ESTADO_INVALIDO'; end if;
  if not public.es_personal(v_uid) then
    if v_res.usuario_id is distinct from v_uid then raise exception 'RESERVA_NO_ENCONTRADA'; end if;
    select * into v_cfg from public.configuracion where id = 1;
    if (v_res.fecha + v_res.hora_inicio) - public.ahora_local() < make_interval(hours => v_cfg.horas_min_cancelacion) then
      raise exception 'FUERA_DE_PLAZO';
    end if;
  end if;
  update public.reservas set estado = 'CANCELADA' where id = p_id;
  delete from public.reserva_bloques where reserva_id = p_id;
end $$;

create or replace function public.cambiar_estado_reserva(p_id uuid, p_estado public.estado_reserva)
returns void language plpgsql security definer set search_path = public as $$
declare v_res public.reservas; v_cfg public.configuracion;
begin
  if not public.es_personal(auth.uid()) then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_res from public.reservas where id = p_id for update;
  if not found then raise exception 'RESERVA_NO_ENCONTRADA'; end if;
  select * into v_cfg from public.configuracion where id = 1;
  if v_res.estado = 'CONFIRMADA' and p_estado = 'EN_USO' then
    update public.reservas set estado = 'EN_USO', hora_entrada = now() where id = p_id;
  elsif v_res.estado = 'EN_USO' and p_estado = 'FINALIZADA' then
    update public.reservas set estado = 'FINALIZADA', hora_salida = now() where id = p_id;
    delete from public.reserva_bloques where reserva_id = p_id;
  elsif v_res.estado = 'CONFIRMADA' and p_estado = 'NO_PRESENTADA' then
    if public.ahora_local() < (v_res.fecha + v_res.hora_inicio) + make_interval(mins => v_cfg.minutos_tolerancia) then
      raise exception 'TOLERANCIA_NO_CUMPLIDA';
    end if;
    update public.reservas set estado = 'NO_PRESENTADA' where id = p_id;
    delete from public.reserva_bloques where reserva_id = p_id;
  else
    raise exception 'TRANSICION_INVALIDA';
  end if;
end $$;

create or replace function public.registrar_consumo(p_reserva_id uuid, p_producto_id uuid, p_cantidad int)
returns void language plpgsql security definer set search_path = public as $$
declare v_res public.reservas; v_prod public.productos; v_tipo public.tipo_recurso;
begin
  if not public.es_personal(auth.uid()) then raise exception 'NO_AUTORIZADO'; end if;
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
  select * into v_res from public.reservas where id = p_reserva_id;
  if not found then raise exception 'RESERVA_NO_ENCONTRADA'; end if;
  select tipo into v_tipo from public.recursos where id = v_res.recurso_id;
  if v_tipo <> 'SALA_MINICINE' or v_res.estado <> 'EN_USO' then raise exception 'CONSUMO_NO_PERMITIDO'; end if;
  select * into v_prod from public.productos where id = p_producto_id for update;
  if not found or not v_prod.activo then raise exception 'PRODUCTO_INVALIDO'; end if;
  if v_prod.existencias < p_cantidad then raise exception 'SIN_STOCK'; end if;
  insert into public.consumos (reserva_id, producto_id, cantidad, precio_unitario, registrado_por)
  values (p_reserva_id, p_producto_id, p_cantidad, v_prod.precio, auth.uid());
  update public.productos set existencias = existencias - p_cantidad where id = p_producto_id;
end $$;

create or replace function public.reporte_resumen(p_desde date, p_hasta date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_hor public.horario_atencion; v_bpd int; v_dias int; v_total_rec int; v_occ numeric; res jsonb;
begin
  if not public.has_role(auth.uid(),'ADMINISTRADOR') then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_hor from public.horario_atencion where id = 1;
  v_bpd := extract(hour from v_hor.hora_cierre)::int - extract(hour from v_hor.hora_apertura)::int;
  v_dias := (p_hasta - p_desde) + 1;
  select count(*) into v_total_rec from public.recursos where activo;
  select coalesce(sum(bloques),0) into v_occ from public.reservas
    where fecha between p_desde and p_hasta and estado in ('EN_USO','FINALIZADA');

  res := jsonb_build_object(
    'ocupacion_pct', case when v_total_rec*v_bpd*v_dias > 0 then round(100.0*v_occ/(v_total_rec*v_bpd*v_dias),1) else 0 end,
    'por_tipo', (select coalesce(jsonb_agg(x order by x->>'tipo'),'[]'::jsonb) from (
        select jsonb_build_object('tipo', t.tipo,
          'ocupacion_pct', case when rc.n*v_bpd*v_dias > 0 then round(100.0*coalesce(oc.b,0)/(rc.n*v_bpd*v_dias),1) else 0 end,
          'ingresos', coalesce(ing.i,0)) x
        from public.tarifas t
        left join (select tipo, count(*) n from public.recursos where activo group by tipo) rc on rc.tipo = t.tipo
        left join (select r.tipo, sum(re.bloques) b from public.reservas re join public.recursos r on r.id=re.recurso_id
                   where re.fecha between p_desde and p_hasta and re.estado in ('EN_USO','FINALIZADA') group by r.tipo) oc on oc.tipo=t.tipo
        left join (select r.tipo, sum(re.bloques*tf.precio_hora) i from public.reservas re join public.recursos r on r.id=re.recurso_id
                   join public.tarifas tf on tf.tipo=r.tipo
                   where re.fecha between p_desde and p_hasta and re.estado='FINALIZADA' group by r.tipo) ing on ing.tipo=t.tipo
      ) s),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('fecha', d::date,
          'ingresos_reservas', coalesce((select sum(re.bloques*tf.precio_hora) from public.reservas re join public.recursos r on r.id=re.recurso_id join public.tarifas tf on tf.tipo=r.tipo where re.fecha=d::date and re.estado='FINALIZADA'),0),
          'ingresos_consumos', coalesce((select sum(c.cantidad*c.precio_unitario) from public.consumos c join public.reservas re on re.id=c.reserva_id where re.fecha=d::date),0)
        ) order by d),'[]'::jsonb)
      from generate_series(p_desde, p_hasta, interval '1 day') d)
  );
  return res;
end $$;

revoke execute on function public.crear_reserva, public.cancelar_reserva, public.cambiar_estado_reserva,
  public.registrar_consumo, public.reporte_resumen, public.obtener_ocupacion from public, anon;
grant execute on function public.crear_reserva, public.cancelar_reserva, public.cambiar_estado_reserva,
  public.registrar_consumo, public.reporte_resumen, public.obtener_ocupacion to authenticated;
revoke execute on function public.handle_new_user from public, anon, authenticated;

-- Seed
insert into public.horario_atencion (id, hora_apertura, hora_cierre) values (1, '10:00', '23:00');
insert into public.configuracion (id) values (1);
insert into public.recursos (nombre, tipo, capacidad) values
 ('Mesa 1','MESA_NORMAL',6),('Mesa 2','MESA_NORMAL',6),('Mesa 3','MESA_NORMAL',6),
 ('Mesa VIP 1','MESA_VIP',8),('Mesa VIP 2','MESA_VIP',8),
 ('Sala 1','SALA_MINICINE',8),('Sala 2','SALA_MINICINE',12);
insert into public.tarifas values ('MESA_NORMAL',30),('MESA_VIP',50),('SALA_MINICINE',60);
insert into public.peliculas (titulo, duracion_min) values
 ('Dune: Parte Dos',166),('Intensa-Mente 2',96),('Oppenheimer',180),('Spider-Man: A través del Spider-Verso',140),('Coco',105);
insert into public.productos (nombre, precio, existencias) values
 ('Pipocas grandes',25,50),('Pipocas medianas',18,50),('Gaseosa',10,80),('Agua',6,60),
 ('Nachos',22,30),('Hot dog',20,30),('Chocolate',8,40),('Cerveza',15,48);
insert into public.lista_blanca (correo, rol) values ('antoniomir534@gmail.com','ADMINISTRADOR');