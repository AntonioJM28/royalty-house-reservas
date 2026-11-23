import { createFileRoute, redirect } from "@tanstack/react-router";
import { esAdmin } from "@/lib/sesion";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: ({ context }) => {
    if (!esAdmin(context.sesion.roles)) throw redirect({ to: "/cliente" });
  },
  head: () => ({ meta: [{ title: "Administración — Royalty House" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl space-y-2">
      <h1 className="font-display text-3xl">Administración</h1>
      <p className="text-muted-foreground">Las pantallas de administración y reportes estarán disponibles pronto.</p>
    </div>
  ),
});
