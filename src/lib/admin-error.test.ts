import { describe, expect, it } from "vitest";
import { adminError } from "./admin";

describe("adminError", () => {
  it("distingue permisos insuficientes de registro no encontrado", () => {
    expect(adminError({ code: "42501" })).toContain("(42501)");
    expect(adminError({ code: "PGRST116" })).toContain("(PGRST116)");
    expect(adminError({ code: "PGRST116" })).not.toContain("permiso de administrador");
  });

  it("muestra el mensaje de errores planos devueltos por Supabase", () => {
    expect(adminError({ code: "42883", message: "function does not exist" })).toBe(
      "function does not exist",
    );
  });
});
