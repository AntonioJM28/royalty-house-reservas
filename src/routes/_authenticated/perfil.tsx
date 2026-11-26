import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Completa tu perfil — Royalty House" }] }),
  component: Perfil,
});

function Perfil() {
  const { sesion } = Route.useRouteContext();
  const router = useRouter();
  const [tel, setTel] = useState(sesion.perfil?.telefono ?? "");
  const [acepto, setAcepto] = useState(sesion.perfil?.acepto_datos ?? false);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9+ ]{7,15}$/.test(tel.trim())) return toast.error("Ingresa un teléfono válido (7 a 15 dígitos).");
    if (!acepto) return toast.error("Debes aceptar el tratamiento de datos para reservar.");
    setGuardando(true);
    const { data: usuario } = await supabase.auth.getUser();
    const user = usuario.user;
    if (!user) {
      setGuardando(false);
      return toast.error("Tu sesión expiró. Vuelve a iniciar sesión.");
    }

    const { data: perfilGuardado, error } = await supabase.rpc("completar_perfil", {
      p_telefono: tel.trim(),
    });
    setGuardando(false);
    if (error) {
      console.error("Error guardando perfil:", error);
      return toast.error("No se pudo guardar tu perfil.", {
        description: error.message || "Revisa las políticas de seguridad de Supabase.",
      });
    }

    if (
      !perfilGuardado ||
      typeof perfilGuardado !== "object" ||
      !("telefono" in perfilGuardado) ||
      perfilGuardado.telefono !== tel.trim() ||
      !("acepto_datos" in perfilGuardado) ||
      perfilGuardado.acepto_datos !== true ||
      !("id" in perfilGuardado) ||
      perfilGuardado.id !== user.id
    ) {
      console.error("La función de perfil terminó sin confirmar los datos guardados.", perfilGuardado);
      return toast.error("No se confirmaron los datos del perfil.", {
        description: "La base de datos no devolvió el perfil actualizado. Verifica la función completar_perfil en Supabase.",
      });
    }

    await router.invalidate();
    await router.navigate({ to: "/cliente/nueva" });
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-3xl">Bienvenido, {sesion.perfil?.nombre}</CardTitle>
        <CardDescription>Antes de reservar necesitamos tu teléfono de contacto.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={guardar} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tel">Teléfono</Label>
            <Input id="tel" inputMode="tel" placeholder="70000000" value={tel} onChange={(e) => setTel(e.target.value)} />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={acepto} onCheckedChange={(v) => setAcepto(v === true)} className="mt-0.5" />
            <span>Acepto el tratamiento de mis datos personales (nombre, correo y teléfono) para gestionar mis reservas en Royalty House.</span>
          </label>
          <Button type="submit" className="w-full" disabled={guardando || !acepto}>
            {guardando ? "Guardando…" : "Guardar y continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
