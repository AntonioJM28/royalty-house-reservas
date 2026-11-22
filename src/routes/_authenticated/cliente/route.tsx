import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { esPersonal, perfilCompleto } from "@/lib/sesion";

export const Route = createFileRoute("/_authenticated/cliente")({
  beforeLoad: ({ context }) => {
    if (esPersonal(context.sesion.roles)) throw redirect({ to: "/recepcion" });
    if (!perfilCompleto(context.sesion.perfil)) throw redirect({ to: "/perfil" });
  },
  component: Outlet,
});
