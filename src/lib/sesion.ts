import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "./negocio";

export type Perfil = { id: string; nombre: string; correo: string; telefono: string | null; acepto_datos: boolean };
export type Sesion = { userId: string; roles: Rol[]; perfil: Perfil | null };

export async function cargarSesion(): Promise<Sesion | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: roles }, { data: perfil }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("id,nombre,correo,telefono,acepto_datos").eq("id", user.id).maybeSingle(),
  ]);
  return { userId: user.id, roles: (roles ?? []).map((r) => r.role as Rol), perfil: perfil ?? null };
}

export const esAdmin = (r: Rol[]) => r.includes("ADMINISTRADOR");
export const esPersonal = (r: Rol[]) => r.includes("ADMINISTRADOR") || r.includes("RECEPCIONISTA");
export const perfilCompleto = (p: Perfil | null) => !!p && !!p.telefono && p.acepto_datos;

/** Destino tras el login según el rol. */
export function destinoInicial(s: Sesion): "/admin" | "/recepcion" | "/cliente" | "/perfil" {
  if (esAdmin(s.roles)) return "/admin";
  if (esPersonal(s.roles)) return "/recepcion";
  if (!perfilCompleto(s.perfil)) return "/perfil";
  return "/cliente";
}
