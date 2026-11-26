-- RPC para consultar los bloques ocupados de los recursos solicitados.
create or replace function public.obtener_ocupacion(
  p_fecha date,
  p_tipo public.tipo_recurso[]
)
returns table (recurso_id uuid, bloque integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NO_AUTENTICADO';
  end if;

  return query
    select b.recurso_id, b.bloque
    from public.reserva_bloques b
    join public.recursos r on r.id = b.recurso_id
    where b.fecha = p_fecha
      and r.tipo = any(p_tipo);
end;
$$;

revoke all on function public.obtener_ocupacion(date, public.tipo_recurso[]) from public, anon;
grant execute on function public.obtener_ocupacion(date, public.tipo_recurso[]) to authenticated;

notify pgrst, 'reload schema';
