import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "./negocio";

export type Perfil = { id: string; nombre: string; correo: string; telefono: string | null; acepto_datos: boolean };
export type Sesion = { userId: string; roles: Rol[]; perfil: Perfil | null };

export async function cargarSesion(): Promise<Sesion | null> {
  const { data, error: errorAuth } = await supabase.auth.getUser();
  if (errorAuth) throw new Error(`No se pudo verificar la sesión: ${errorAuth.message}`);
  const user = data.user;
  if (!user) return null;
  const [rolesResult, perfilResult] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("id,nombre,correo,telefono,acepto_datos").eq("id", user.id).maybeSingle(),
  ]);
  if (rolesResult.error) throw new Error(`No se pudieron cargar los roles: ${rolesResult.error.message}`);
  if (perfilResult.error) throw new Error(`No se pudo cargar el perfil: ${perfilResult.error.message}`);
  return {
    userId: user.id,
    roles: (rolesResult.data ?? []).map((r) => r.role as Rol),
    perfil: perfilResult.data,
  };
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
