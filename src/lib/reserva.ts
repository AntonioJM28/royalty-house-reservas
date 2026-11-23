import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RESERVA_SELECT } from "./datos";
import type { EstadoReserva, TipoRecurso } from "./negocio";

export type ReservaFull = {
  id: string; codigo: string; usuario_id: string | null; nombre_cliente: string; telefono_cliente: string;
  recurso_id: string; pelicula_id: string | null; fecha: string; hora_inicio: string; bloques: number; personas: number | null;
  estado: EstadoReserva; hora_entrada: string | null; hora_salida: string | null;
  recursos: { nombre: string; tipo: TipoRecurso } | null;
  peliculas: { titulo: string; duracion_min: number } | null;
};

export const reservaQuery = (id: string) =>
  queryOptions({
    queryKey: ["reservas", "una", id],
    queryFn: async () => {
      const [r, ped, con] = await Promise.all([
        supabase.from("reservas").select(RESERVA_SELECT).eq("id", id).maybeSingle(),
        supabase.from("pedido_candy").select("id,cantidad,productos(nombre,precio)").eq("reserva_id", id),
        supabase.from("consumos").select("id,cantidad,precio_unitario,fecha,productos(nombre)").eq("reserva_id", id).order("fecha"),
      ]);
      if (r.error) throw r.error;
      return {
        reserva: r.data as unknown as ReservaFull | null,
        pedido: (ped.data ?? []) as unknown as { id: string; cantidad: number; productos: { nombre: string; precio: number } | null }[],
        consumos: (con.data ?? []) as unknown as { id: string; cantidad: number; precio_unitario: number; fecha: string; productos: { nombre: string } | null }[],
      };
    },
  });
