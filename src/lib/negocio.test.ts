import { describe, expect, it } from "vitest";
import { bloquesPelicula, costoEstimado, costoMinicine, puedeCancelar, puedeMarcarNoPresentada, inicioDisponible, mensajeError } from "./negocio";

const at = (iso: string) => Date.parse(iso);

describe("reglas de negocio", () => {
  it("bloques de minicine = ceil(duración/60)", () => {
    expect(bloquesPelicula(166)).toBe(3);
    expect(bloquesPelicula(120)).toBe(2);
  });
  it("costo = tarifa × horas + productos", () => {
    expect(costoEstimado(60, 3, [{ precio: 25, cantidad: 2 }])).toBe(230);
  });
  it("billar normal 20 Bs/h y VIP 35 Bs/h", () => {
    expect(costoEstimado(20, 2)).toBe(40);
    expect(costoEstimado(35, 2)).toBe(70);
  });
  it("minicine 10 Bs por persona, máximo 7, sin importar la duración", () => {
    expect(costoMinicine(10, 3)).toBe(30);
    expect(costoMinicine(10, 9)).toBe(70);
    expect(costoMinicine(10, 2, [{ precio: 15, cantidad: 1 }])).toBe(35);
  });
  it("cliente no cancela con menos de 2 horas", () => {
    const now = at("2026-11-22T12:30:00-04:00");
    expect(puedeCancelar("2026-11-22", "14:00", 2, now)).toBe(false);
    expect(puedeCancelar("2026-11-22", "15:00", 2, now)).toBe(true);
  });
  it("no presentada solo tras 15 min de tolerancia", () => {
    expect(puedeMarcarNoPresentada("2026-11-22", "14:00", 15, at("2026-11-22T14:10:00-04:00"))).toBe(false);
    expect(puedeMarcarNoPresentada("2026-11-22", "14:00", 15, at("2026-11-22T14:15:00-04:00"))).toBe(true);
  });
  it("no se elige un inicio con bloques ocupados, pasado o fuera de horario", () => {
    const base = { apertura: 10, cierre: 23, fecha: "2026-11-22", now: at("2026-11-22T12:30:00-04:00") };
    expect(inicioDisponible({ ...base, inicio: 14, bloques: 2, ocupados: new Set([15]) })).toBe(false);
    expect(inicioDisponible({ ...base, inicio: 14, bloques: 2, ocupados: new Set() })).toBe(true);
    expect(inicioDisponible({ ...base, inicio: 12, bloques: 1, ocupados: new Set() })).toBe(false);
    expect(inicioDisponible({ ...base, inicio: 22, bloques: 2, ocupados: new Set() })).toBe(false);
  });
  it("traduce HORARIO_OCUPADO", () => {
    expect(mensajeError({ message: "HORARIO_OCUPADO" })).toBe("El horario fue ocupado. Elige otro horario.");
  });
});
