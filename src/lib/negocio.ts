// Reglas y utilidades del negocio Royalty House (zona America/La_Paz, UTC-4 fijo).
export type TipoRecurso = "MESA_NORMAL" | "MESA_VIP" | "SALA_MINICINE";
export type EstadoReserva = "CONFIRMADA" | "EN_USO" | "FINALIZADA" | "CANCELADA" | "NO_PRESENTADA";
export type Rol = "CLIENTE" | "RECEPCIONISTA" | "ADMINISTRADOR";

export const OFFSET = "-04:00";

export const TIPO_LABEL: Record<TipoRecurso, string> = {
  MESA_NORMAL: "Mesa normal",
  MESA_VIP: "Mesa VIP",
  SALA_MINICINE: "Sala de minicine",
};
export const ESTADO_LABEL: Record<EstadoReserva, string> = {
  CONFIRMADA: "Confirmada",
  EN_USO: "En uso",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  NO_PRESENTADA: "No presentada",
};

/** Fecha de hoy en La Paz (YYYY-MM-DD). */
export function hoyLaPaz(now: number = Date.now()): string {
  return new Date(now - 4 * 3600_000).toISOString().slice(0, 10);
}
/** Instante absoluto (ms) de una fecha + hora local de La Paz. */
export function instanteLocal(fecha: string, hora: string): number {
  const hhmm = hora.slice(0, 5);
  return Date.parse(`${fecha}T${hhmm}:00${OFFSET}`);
}
export function horaDe(time: string): number {
  return parseInt(time.slice(0, 2), 10);
}
export function hh(b: number): string {
  return `${String(b).padStart(2, "0")}:00`;
}
export function rango(inicio: number, bloques: number): string {
  return `${hh(inicio)} – ${hh(inicio + bloques)}`;
}

/** RN 05: bloques de minicine = ceil(duración / 60). */
export function bloquesPelicula(duracionMin: number): number {
  return Math.ceil(duracionMin / 60);
}

/** Costo estimado = tarifa × horas + Σ productos. */
export function costoEstimado(
  precioHora: number,
  bloques: number,
  productos: { precio: number; cantidad: number }[] = [],
): number {
  return precioHora * bloques + productos.reduce((s, p) => s + p.precio * p.cantidad, 0);
}

export const MAX_PERSONAS_MINICINE = 7;

/** Minicine: precio por persona × personas (máx. 7) + Σ productos; no depende de la duración. */
export function costoMinicine(precioPersona: number, personas: number, productos: { precio: number; cantidad: number }[] = []): number {
  const n = Math.min(Math.max(1, Math.floor(personas)), MAX_PERSONAS_MINICINE);
  return precioPersona * n + productos.reduce((s, p) => s + p.precio * p.cantidad, 0);
}

/** RN 10: el cliente puede cancelar si faltan al menos `horasMin` horas. */
export function puedeCancelar(fecha: string, hora: string, horasMin: number, now: number = Date.now()): boolean {
  return instanteLocal(fecha, hora) - now >= horasMin * 3600_000;
}

/** RN 10: "no presentada" solo pasada la tolerancia. */
export function puedeMarcarNoPresentada(fecha: string, hora: string, minTol: number, now: number = Date.now()): boolean {
  return now >= instanteLocal(fecha, hora) + minTol * 60_000;
}

/** Bloque de inicio seleccionable: todos sus bloques libres, dentro del horario y no pasado. */
export function inicioDisponible(opts: {
  inicio: number;
  bloques: number;
  apertura: number;
  cierre: number;
  ocupados: Set<number>;
  fecha: string;
  now?: number;
}): boolean {
  const { inicio, bloques, apertura, cierre, ocupados, fecha } = opts;
  if (inicio < apertura || inicio + bloques > cierre) return false;
  // no se reservan horas pasadas (ni el bloque ya iniciado)
  if (instanteLocal(fecha, hh(inicio)) < (opts.now ?? Date.now())) return false;
  for (let b = inicio; b < inicio + bloques; b++) if (ocupados.has(b)) return false;
  return true;
}

const ERRORES: Record<string, string> = {
  HORARIO_OCUPADO: "El horario fue ocupado. Elige otro horario.",
  MAX_RESERVAS: "Ya tienes el máximo de reservas activas permitidas.",
  FUERA_DE_PLAZO: "Ya no puedes cancelar: falta menos del plazo mínimo para el inicio.",
  PERFIL_INCOMPLETO: "Completa tu teléfono y acepta el tratamiento de datos antes de reservar.",
  HORA_PASADA: "No se pueden reservar horas pasadas.",
  FUERA_DE_HORARIO: "El horario elegido está fuera del horario de atención.",
  BLOQUES_INVALIDOS: "La duración elegida no es válida.",
  PERSONAS_INVALIDAS: "Indica entre 1 y 7 asistentes para el minicine.",
  PELICULA_REQUERIDA: "Debes elegir una película en cartelera.",
  CANDY_SOLO_MINICINE: "El candy bar solo está disponible para minicine.",
  SIN_STOCK: "No hay existencias suficientes de ese producto.",
  TOLERANCIA_NO_CUMPLIDA: "Aún no pasó el tiempo de tolerancia.",
  TRANSICION_INVALIDA: "Ese cambio de estado no está permitido.",
  CONSUMO_NO_PERMITIDO: "Solo se registran consumos en reservas de minicine en uso.",
  NO_AUTORIZADO: "No tienes permiso para esta acción.",
  DATOS_CLIENTE_REQUERIDOS: "Ingresa el nombre y teléfono del cliente.",
  RECURSO_INVALIDO: "El recurso no está disponible.",
  ESTADO_INVALIDO: "La reserva ya no está confirmada.",
};
export function mensajeError(err: unknown): string {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
  for (const k of Object.keys(ERRORES)) if (msg.includes(k)) return ERRORES[k] as string;
  return msg || "Ocurrió un error. Intenta nuevamente.";
}
export function bs(n: number): string {
  return `Bs ${Number(n).toFixed(2)}`;
}
