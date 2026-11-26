-- Permite que cada usuario lea únicamente sus propios roles.
grant usage on schema public to authenticated;
grant select on table public.user_roles to authenticated;

alter table public.user_roles enable row level security;

drop policy if exists "roles propios" on public.user_roles;
create policy "roles propios" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid());
