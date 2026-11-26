import { describe, it, expect } from 'vitest';
import { reglasSchema, rangoValido } from './admin-reglas';
const base = { hora_apertura: '10:00', hora_cierre: '23:00', horas_min_cancelacion: 2, minutos_tolerancia: 15, max_reservas_activas: 2, max_bloques_billar: 4 };
describe('reglas', () => {
  it('acepta valores válidos', () => expect(reglasSchema.safeParse(base).success).toBe(true));
  it('rechaza cierre antes de apertura', () => expect(reglasSchema.safeParse({ ...base, hora_cierre: '09:00' }).success).toBe(false));
  it('rechaza horas no en punto', () => expect(reglasSchema.safeParse({ ...base, hora_apertura: '10:30' }).success).toBe(false));
  it('rechaza máximo de reservas 0', () => expect(reglasSchema.safeParse({ ...base, max_reservas_activas: 0 }).success).toBe(false));
  it('rango invertido es inválido', () => expect(rangoValido('2026-01-05', '2026-01-01')).not.toBeNull());
  it('rango normal es válido', () => expect(rangoValido('2026-01-01', '2026-01-07')).toBeNull());
});
