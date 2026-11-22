create or replace function public.sync_lista_blanca()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if tg_op in ('DELETE','UPDATE') then
    select id into v_uid from public.profiles where correo = lower(old.correo);
    if v_uid is not null then
      delete from public.user_roles where user_id = v_uid and role in ('RECEPCIONISTA','ADMINISTRADOR');
      insert into public.user_roles (user_id, role) values (v_uid,'CLIENTE') on conflict do nothing;
    end if;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    new.correo := lower(new.correo);
    select id into v_uid from public.profiles where correo = new.correo;
    if v_uid is not null then
      delete from public.user_roles where user_id = v_uid;
      insert into public.user_roles (user_id, role) values (v_uid, new.rol) on conflict do nothing;
    end if;
    return new;
  end if;
  return old;
end $$;
create trigger trg_lista_blanca_before before insert or update on public.lista_blanca
  for each row execute function public.sync_lista_blanca();
create trigger trg_lista_blanca_after_delete after delete on public.lista_blanca
  for each row execute function public.sync_lista_blanca();
revoke execute on function public.sync_lista_blanca from public, anon, authenticated;