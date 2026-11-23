ALTER TABLE public.reservas ADD COLUMN personas integer;
DROP FUNCTION public.crear_reserva(uuid, date, time without time zone, integer, uuid, text, text, jsonb);
CREATE FUNCTION public.crear_reserva(p_recurso_id uuid, p_fecha date, p_hora_inicio time without time zone, p_bloques integer, p_pelicula_id uuid DEFAULT NULL::uuid, p_nombre_cliente text DEFAULT NULL::text, p_telefono_cliente text DEFAULT NULL::text, p_productos jsonb DEFAULT '[]'::jsonb, p_personas integer DEFAULT NULL)
 RETURNS reservas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    if p_personas is null or p_personas < 1 or p_personas > least(7, v_rec.capacidad) then raise exception 'PERSONAS_INVALIDAS'; end if;
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
    insert into public.reservas (codigo, usuario_id, nombre_cliente, telefono_cliente, recurso_id, pelicula_id, fecha, hora_inicio, bloques, creada_por, personas)
    values (v_codigo, v_usuario, v_nombre, v_tel, p_recurso_id, case when v_rec.tipo='SALA_MINICINE' then p_pelicula_id end, p_fecha, p_hora_inicio, p_bloques, v_uid,
            case when v_rec.tipo='SALA_MINICINE' then p_personas end)
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
end $function$;
REVOKE EXECUTE ON FUNCTION public.crear_reserva(uuid, date, time without time zone, integer, uuid, text, text, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_reserva(uuid, date, time without time zone, integer, uuid, text, text, jsonb, integer) TO authenticated;