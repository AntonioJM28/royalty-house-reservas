-- Funciones auxiliares requeridas por crear_reserva.
create or replace function public.ahora_local()
returns timestamp
language sql
stable
set search_path = public
as $$
  select now() at time zone 'America/La_Paz'
$$;

create or replace function public.generar_codigo()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  resultado text := '';
  i integer;
begin
  for i in 1..8 loop
    resultado := resultado || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
  end loop;
  return resultado;
end
$$;

notify pgrst, 'reload schema';
