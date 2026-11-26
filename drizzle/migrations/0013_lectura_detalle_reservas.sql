-- Allow authenticated users to read only candy orders and consumptions
-- permitted by the reservation ownership/personnel policies.
grant usage on schema public to authenticated;
grant select on table public.pedido_candy, public.consumos to authenticated;

alter table public.pedido_candy enable row level security;
alter table public.consumos enable row level security;

drop policy if exists "pedido propio o personal" on public.pedido_candy;
create policy "pedido propio o personal" on public.pedido_candy
  for select to authenticated
  using (
    public.es_personal(auth.uid())
    or exists (
      select 1
      from public.reservas r
      where r.id = reserva_id
        and r.usuario_id = auth.uid()
    )
  );

drop policy if exists "consumo propio o personal" on public.consumos;
create policy "consumo propio o personal" on public.consumos
  for select to authenticated
  using (
    public.es_personal(auth.uid())
    or exists (
      select 1
      from public.reservas r
      where r.id = reserva_id
        and r.usuario_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
