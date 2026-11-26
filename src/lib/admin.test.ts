import { describe, expect, it } from 'vitest';
import { recursoSchema, personalSchema, productoSchema } from './admin';
import { destinoInicial, esAdmin, esPersonal } from './sesion';

describe('Administración', () => {
  it('salas admiten hasta 7 asistentes', () => {
    const sala = { nombre: 'Sala', tipo: 'SALA_MINICINE', activo: true };
    expect(recursoSchema.safeParse({ ...sala, capacidad: 7 }).success).toBe(true);
    expect(recursoSchema.safeParse({ ...sala, capacidad: 8 }).success).toBe(false);
    expect(recursoSchema.safeParse({ ...sala, capacidad: 0 }).success).toBe(false);
  });
  it('solo administrador accede a administración', () => {
    expect(esAdmin(['ADMINISTRADOR'])).toBe(true);
    expect(esAdmin(['CLIENTE'])).toBe(false);
    expect(esAdmin(['RECEPCIONISTA'])).toBe(false);
  });
  it('recepcionista va a recepción y nunca a administración', () => {
    const sesion = { userId: 'recepcionista', roles: ['RECEPCIONISTA' as const], perfil: null };
    expect(destinoInicial(sesion)).toBe('/recepcion');
    expect(esPersonal(sesion.roles)).toBe(true);
    expect(esAdmin(sesion.roles)).toBe(false);
  });
  it('personal solo tiene rol de recepción o administrador y normaliza el correo', () => {
    expect(personalSchema.parse({ correo: '  Persona@Example.com ', rol: 'RECEPCIONISTA' }).correo).toBe('persona@example.com');
    expect(personalSchema.safeParse({ correo: 'a@example.com', rol: 'ADMINISTRADOR' }).success).toBe(true);
    expect(personalSchema.safeParse({ correo: 'a@example.com', rol: 'CLIENTE' }).success).toBe(false);
  });
  it('stock entero y no negativo', () => {
    const producto = { nombre: 'Agua', precio: 5, activo: true };
    expect(productoSchema.safeParse({ ...producto, existencias: 0 }).success).toBe(true);
    expect(productoSchema.safeParse({ ...producto, existencias: -1 }).success).toBe(false);
    expect(productoSchema.safeParse({ ...producto, existencias: 1.5 }).success).toBe(false);
  });
});
