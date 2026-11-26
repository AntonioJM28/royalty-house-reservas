import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser } },
}));

import { cargarSesion } from "./sesion";

describe("cargarSesion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve null cuando no hay una sesión activa", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
    });

    await expect(cargarSesion()).resolves.toBeNull();
  });

  it("mantiene los errores reales al verificar la sesión", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthError", message: "Error de autenticación" },
    });

    await expect(cargarSesion()).rejects.toThrow(
      "No se pudo verificar la sesión: Error de autenticación",
    );
  });
});
