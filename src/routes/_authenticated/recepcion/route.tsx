import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { esPersonal } from "@/lib/sesion";

export const Route = createFileRoute("/_authenticated/recepcion")({
  beforeLoad: ({ context }) => {
    if (!esPersonal(context.sesion.roles)) throw redirect({ to: "/cliente" });
  },
  component: Outlet,
});
