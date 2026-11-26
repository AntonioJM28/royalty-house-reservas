import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const entero = z.coerce.number({ invalid_type_error: 'Escribe un número.' }).int('Usa un número entero.');
const hora = z.string().regex(/^\d{2}:00(:00)?$/, 'Usa una hora en punto (por ejemplo 10:00).');

export const reglasSchema = z.object({
  hora_apertura: hora,
  hora_cierre: hora,
  horas_min_cancelacion: entero.min(0, 'No puede ser negativo.').max(72, 'Máximo 72 horas.'),
  minutos_tolerancia: entero.min(0, 'No puede ser negativo.').max(120, 'Máximo 120 minutos.'),
  max_reservas_activas: entero.min(1, 'Mínimo 1 reserva.').max(20, 'Máximo 20 reservas.'),
  max_bloques_billar: entero.min(1, 'Mínimo 1 hora.').max(8, 'Máximo 8 horas.'),
}).refine(r => r.hora_cierre.slice(0, 5) > r.hora_apertura.slice(0, 5), { message: 'El cierre debe ser después de la apertura.', path: ['hora_cierre'] });
export type Reglas = z.infer<typeof reglasSchema>;

export const reglasQuery = queryOptions({
  queryKey: ['admin-reglas'],
  queryFn: async () => {
    const [h, c] = await Promise.all([
      supabase.from('horario_atencion').select('*').eq('id', 1).single(),
      supabase.from('configuracion').select('*').eq('id', 1).single(),
    ]);
    if (h.error) throw h.error;
    if (c.error) throw c.error;
    return { horario: h.data, config: c.data };
  },
});

export async function guardarReglas(input: unknown) {
  const p = reglasSchema.safeParse(input);
  if (!p.success) throw new Error(p.error.issues[0]?.message ?? 'Revisa los datos.');
  const d = p.data;
  const h = await supabase.from('horario_atencion').update({ hora_apertura: d.hora_apertura.slice(0, 5), hora_cierre: d.hora_cierre.slice(0, 5) }).eq('id', 1).select('id').single();
  if (h.error) throw h.error;
  const c = await supabase.from('configuracion').update({ horas_min_cancelacion: d.horas_min_cancelacion, minutos_tolerancia: d.minutos_tolerancia, max_reservas_activas: d.max_reservas_activas, max_bloques_billar: d.max_bloques_billar }).eq('id', 1).select('id').single();
  if (c.error) throw c.error;
}

export type Reporte = {
  ocupacion_pct: number;
  por_tipo: { tipo: 'MESA_NORMAL' | 'MESA_VIP' | 'SALA_MINICINE'; ocupacion_pct: number; ingresos: number }[];
  por_dia: { fecha: string; ingresos_reservas: number; ingresos_consumos: number }[];
};
export const reporteQuery = (desde: string, hasta: string) => queryOptions({
  queryKey: ['admin-reporte', desde, hasta],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('reporte_resumen', { p_desde: desde, p_hasta: hasta });
    if (error) throw error;
    return data as unknown as Reporte;
  },
});
export function rangoValido(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'Elige ambas fechas.';
  if (hasta < desde) return 'La fecha final debe ser igual o posterior a la inicial.';
  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400000 + 1;
  if (dias > 92) return 'El rango máximo es de 92 días.';
  return null;
}
