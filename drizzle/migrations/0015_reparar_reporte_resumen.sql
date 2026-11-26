-- Recreate the report RPC with the argument names expected by the client.
create or replace function public.ingreso_reserva(
  p_bloques integer,
  p_personas integer,
  p_tipo public.tipo_recurso,
  p_precio numeric
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_tipo = 'SALA_MINICINE' then coalesce(p_personas, 1) * p_precio
    else p_bloques * p_precio
  end
$$;

drop function if exists public.reporte_resumen(date, date);

create function public.reporte_resumen(
  p_desde date,
  p_hasta date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hor public.horario_atencion;
  v_bpd integer;
  v_dias integer;
  v_total_rec integer;
  v_occ numeric;
  res jsonb;
begin
  if not public.has_role(auth.uid(), 'ADMINISTRADOR') then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_hasta < p_desde then
    raise exception 'RANGO_INVALIDO';
  end if;

  select * into v_hor from public.horario_atencion where id = 1;
  v_bpd := extract(hour from v_hor.hora_cierre)::integer
    - extract(hour from v_hor.hora_apertura)::integer;
  v_dias := (p_hasta - p_desde) + 1;
  select count(*) into v_total_rec from public.recursos where activo;
  select coalesce(sum(bloques), 0) into v_occ
  from public.reservas
  where fecha between p_desde and p_hasta
    and estado in ('EN_USO', 'FINALIZADA');

  res := jsonb_build_object(
    'ocupacion_pct',
    case
      when v_total_rec * v_bpd * v_dias > 0
        then round(100.0 * v_occ / (v_total_rec * v_bpd * v_dias), 1)
      else 0
    end,
    'por_tipo',
    (
      select coalesce(jsonb_agg(x order by x->>'tipo'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'tipo', t.tipo,
          'ocupacion_pct',
          case
            when rc.n * v_bpd * v_dias > 0
              then round(100.0 * coalesce(oc.b, 0) / (rc.n * v_bpd * v_dias), 1)
            else 0
          end,
          'ingresos', coalesce(ing.i, 0)
        ) x
        from public.tarifas t
        left join (
          select tipo, count(*) n
          from public.recursos
          where activo
          group by tipo
        ) rc on rc.tipo = t.tipo
        left join (
          select r.tipo, sum(re.bloques) b
          from public.reservas re
          join public.recursos r on r.id = re.recurso_id
          where re.fecha between p_desde and p_hasta
            and re.estado in ('EN_USO', 'FINALIZADA')
          group by r.tipo
        ) oc on oc.tipo = t.tipo
        left join (
          select r.tipo,
            sum(public.ingreso_reserva(re.bloques, re.personas, r.tipo, tf.precio_hora)) i
          from public.reservas re
          join public.recursos r on r.id = re.recurso_id
          join public.tarifas tf on tf.tipo = r.tipo
          where re.fecha between p_desde and p_hasta
            and re.estado = 'FINALIZADA'
          group by r.tipo
        ) ing on ing.tipo = t.tipo
      ) s
    ),
    'por_dia',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'fecha', d::date,
            'ingresos_reservas',
            coalesce((
              select sum(public.ingreso_reserva(re.bloques, re.personas, r.tipo, tf.precio_hora))
              from public.reservas re
              join public.recursos r on r.id = re.recurso_id
              join public.tarifas tf on tf.tipo = r.tipo
              where re.fecha = d::date
                and re.estado = 'FINALIZADA'
            ), 0),
            'ingresos_consumos',
            coalesce((
              select sum(c.cantidad * c.precio_unitario)
              from public.consumos c
              join public.reservas re on re.id = c.reserva_id
              where re.fecha = d::date
            ), 0)
          )
          order by d
        ),
        '[]'::jsonb
      )
      from generate_series(p_desde, p_hasta, interval '1 day') d
    )
  );

  return res;
end
$$;

revoke all on function public.reporte_resumen(date, date) from public, anon;
grant execute on function public.reporte_resumen(date, date) to authenticated;

notify pgrst, 'reload schema';
