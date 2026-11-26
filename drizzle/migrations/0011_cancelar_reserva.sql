create or replace function public.cancelar_reserva(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservas;
  v_cfg public.configuracion;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO';
  end if;

  select * into v_res
  from public.reservas
  where id = p_id
  for update;

  if not found then
    raise exception 'RESERVA_NO_ENCONTRADA';
  end if;

  if v_res.estado <> 'CONFIRMADA' then
    raise exception 'ESTADO_INVALIDO';
  end if;

  if not public.es_personal(v_uid) then
    if v_res.usuario_id is distinct from v_uid then
      raise exception 'RESERVA_NO_ENCONTRADA';
    end if;

    select * into v_cfg
    from public.configuracion
    where id = 1;

    if (v_res.fecha + v_res.hora_inicio) - public.ahora_local()
       < make_interval(hours => v_cfg.horas_min_cancelacion) then
      raise exception 'FUERA_DE_PLAZO';
    end if;
  end if;

  update public.reservas
  set estado = 'CANCELADA'
  where id = p_id;

  delete from public.reserva_bloques
  where reserva_id = p_id;
end
$$;

revoke all on function public.cancelar_reserva(uuid) from public, anon;
grant execute on function public.cancelar_reserva(uuid) to authenticated;

notify pgrst, 'reload schema';
