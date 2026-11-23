import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TipoRecurso } from "./negocio";

async function q<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

export const catalogoQuery = queryOptions({
  queryKey: ["catalogo"],
  queryFn: async () => {
    const [recursos, tarifas, horario, config, peliculas, productos] = await Promise.all([
      q(supabase.from("recursos").select("*").order("nombre")),
      q(supabase.from("tarifas").select("*")),
      supabase.from("horario_atencion").select("*").eq("id", 1).single().then((r) => { if (r.error) throw r.error; return r.data; }),
      supabase.from("configuracion").select("*").eq("id", 1).single().then((r) => { if (r.error) throw r.error; return r.data; }),
      q(supabase.from("peliculas").select("*").order("titulo")),
      q(supabase.from("productos").select("*").order("nombre")),
    ]);
    if (!horario || !config) throw new Error("Falta la configuración del negocio.");
    const tarifa = (t: TipoRecurso) => Number(tarifas.find((x) => x.tipo === t)?.precio_hora ?? 0);
    return { recursos, tarifas, horario, config, peliculas, productos, tarifa };
  },
});

export const ocupacionQuery = (fecha: string, tipos: TipoRecurso[]) =>
  queryOptions({
    queryKey: ["ocupacion", fecha, tipos.join(",")],
    queryFn: () => q(supabase.rpc("obtener_ocupacion", { p_fecha: fecha, p_tipo: tipos })),
  });

export const RESERVA_SELECT = "*, recursos(nombre,tipo), peliculas(titulo,duracion_min)";
