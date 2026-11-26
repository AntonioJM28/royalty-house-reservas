-- Ensure PostgREST exposes the state-change RPC with the argument names used by the client.
drop function if exists public.cambiar_estado_reserva(uuid, public.estado_reserva);

create function public.cambiar_estado_reserva(
  p_id uuid,
  p_estado public.estado_reserva
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservas;
  v_cfg public.configuracion;
begin
  if not public.es_personal(auth.uid()) then
    raise exception 'NO_AUTORIZADO';
  end if;

  select * into v_res
  from public.reservas
  where id = p_id
  for update;

  if not found then
    raise exception 'RESERVA_NO_ENCONTRADA';
  end if;

  select * into v_cfg from public.configuracion where id = 1;

  if v_res.estado = 'CONFIRMADA' and p_estado = 'EN_USO' then
    update public.reservas
    set estado = 'EN_USO', hora_entrada = now()
    where id = p_id;
  elsif v_res.estado = 'EN_USO' and p_estado = 'FINALIZADA' then
    update public.reservas
    set estado = 'FINALIZADA', hora_salida = now()
    where id = p_id;
    delete from public.reserva_bloques where reserva_id = p_id;
  elsif v_res.estado = 'CONFIRMADA' and p_estado = 'NO_PRESENTADA' then
    if public.ahora_local() < (v_res.fecha + v_res.hora_inicio)
      + make_interval(mins => v_cfg.minutos_tolerancia) then
      raise exception 'TOLERANCIA_NO_CUMPLIDA';
    end if;
    update public.reservas
    set estado = 'NO_PRESENTADA'
    where id = p_id;
    delete from public.reserva_bloques where reserva_id = p_id;
  else
    raise exception 'TRANSICION_INVALIDA';
  end if;
end
$$;

revoke all on function public.cambiar_estado_reserva(uuid, public.estado_reserva)
  from public, anon;
grant execute on function public.cambiar_estado_reserva(uuid, public.estado_reserva)
  to authenticated;

notify pgrst, 'reload schema';
