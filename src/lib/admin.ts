import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const nombre = z.string().trim().min(1, 'Escribe un nombre.').max(120, 'Máximo 120 caracteres.');
const entero = z.coerce.number().int('Usa un número entero.');
const precio = z.coerce.number().min(0, 'El precio no puede ser negativo.').max(99999999.99).multipleOf(0.01, 'Usa como máximo dos decimales.');
export const recursoSchema = z.object({ nombre, tipo: z.enum(['MESA_NORMAL', 'MESA_VIP', 'SALA_MINICINE']), capacidad: entero.min(1, 'La capacidad mínima es 1.'), activo: z.boolean() }).superRefine((r, ctx) => {
  if (r.tipo === 'SALA_MINICINE' && r.capacidad > 7) ctx.addIssue({ code: 'custom', path: ['capacidad'], message: 'El minicine admite hasta 7 personas.' });
});
export const peliculaSchema = z.object({ titulo: nombre, duracion_min: entero.min(1, 'La duración mínima es 1 minuto.'), en_cartelera: z.boolean() });
export const productoSchema = z.object({ nombre, precio, existencias: entero.min(0, 'Las existencias no pueden ser negativas.'), activo: z.boolean() });
export const personalSchema = z.object({ correo: z.string().trim().toLowerCase().email('Escribe un correo válido.'), rol: z.enum(['RECEPCIONISTA', 'ADMINISTRADOR']) });
export const tarifaSchema = z.object({ tipo: z.enum(['MESA_NORMAL', 'MESA_VIP', 'SALA_MINICINE']), precio_hora: precio });
export type AdminKind = 'mesas' | 'salas' | 'peliculas' | 'productos' | 'personal';
export type AdminSearch = { q?: string; estado?: 'todos' | 'activos' | 'inactivos' };
export function adminSearch(input: Record<string, unknown>): AdminSearch {
  return { q: typeof input['q'] === 'string' ? input['q'] : '', estado: input['estado'] === 'activos' || input['estado'] === 'inactivos' ? input['estado'] : 'todos' };
}
function validated<T>(result: z.SafeParseReturnType<unknown, T>): T {
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'Revisa los datos.');
  return result.data;
}
async function read<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  if (data === null) throw new Error('No se pudieron cargar los datos.');
  return data;
}
export const adminCatalogQuery = queryOptions({
  queryKey: ['admin-catalog'],
  queryFn: async () => {
    const [recursos, tarifas, peliculas, productos] = await Promise.all([
      read(supabase.from('recursos').select('*').order('nombre')),
      read(supabase.from('tarifas').select('*')),
      read(supabase.from('peliculas').select('*').order('titulo')),
      read(supabase.from('productos').select('*').order('nombre')),
    ]);
    return { recursos, tarifas, peliculas, productos };
  },
});
export const adminPersonalQuery = queryOptions({ queryKey: ['admin-personal'], queryFn: () => read(supabase.from('lista_blanca').select('*').order('correo')) });

// All writes use the caller's client: database administrator policies remain authoritative.
export async function guardarEntidad(kind: AdminKind, id: string | null, input: unknown) {
  if (kind === 'mesas' || kind === 'salas') {
    const data = validated(recursoSchema.safeParse(input));
    if ((kind === 'salas') !== (data.tipo === 'SALA_MINICINE')) throw new Error('Selecciona el tipo de recurso correcto.');
    return read((id ? supabase.from('recursos').update(data).eq('id', id) : supabase.from('recursos').insert(data)).select('id').single());
  }
  if (kind === 'peliculas') {
    const data = validated(peliculaSchema.safeParse(input));
    return read((id ? supabase.from('peliculas').update(data).eq('id', id) : supabase.from('peliculas').insert(data)).select('id').single());
  }
  if (kind === 'productos') {
    const data = validated(productoSchema.safeParse(input));
    return read((id ? supabase.from('productos').update(data).eq('id', id) : supabase.from('productos').insert(data)).select('id').single());
  }
  const data = validated(personalSchema.safeParse(input));
  return read((id ? supabase.from('lista_blanca').update({ rol: data.rol }).eq('correo', id) : supabase.from('lista_blanca').insert(data)).select('correo').single());
}
export async function guardarTarifa(input: unknown) {
  const data = validated(tarifaSchema.safeParse(input));
  return read(supabase.from('tarifas').upsert(data).select('tipo').single());
}
export async function cambiarActividad(kind: AdminKind, id: string, active: boolean) {
  if (kind === 'mesas' || kind === 'salas') return read(supabase.from('recursos').update({ activo: active }).eq('id', id).select('id').single());
  if (kind === 'peliculas') return read(supabase.from('peliculas').update({ en_cartelera: active }).eq('id', id).select('id').single());
  if (kind === 'productos') return read(supabase.from('productos').update({ activo: active }).eq('id', id).select('id').single());
  return read(supabase.from('lista_blanca').delete().eq('correo', id).select('correo').single());
}
export function adminError(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('code' in error && error.code === '23505') return 'Ya existe un registro con ese nombre o correo.';
    if ('code' in error && (error.code === '42501' || error.code === 'PGRST116')) return 'No se pudo guardar. Comprueba que sigues teniendo permiso de administrador.';
    if (error instanceof Error) return error.message;
  }
  return 'No se pudo completar la operación. Intenta nuevamente.';
}
export function adminHead(title: string, description: string) {
  const fullTitle = `${title} — Royalty House`;
  return { meta: [{ title: fullTitle }, { name: 'description', content: description }, { property: 'og:title', content: fullTitle }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] };
}
