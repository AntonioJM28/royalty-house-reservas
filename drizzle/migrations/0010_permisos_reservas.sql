-- Un cliente solo puede consultar sus propias reservas; el personal puede consultar todas.
grant usage on schema public to authenticated;
grant select on table public.reservas to authenticated;

alter table public.reservas enable row level security;

drop policy if exists "reservas propias o personal" on public.reservas;
create policy "reservas propias o personal" on public.reservas
  for select to authenticated
  using (usuario_id = auth.uid() or public.es_personal(auth.uid()));

notify pgrst, 'reload schema';
