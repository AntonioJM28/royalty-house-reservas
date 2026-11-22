import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReservaBuilder } from "@/components/rh/ReservaBuilder";

export const Route = createFileRoute("/_authenticated/cliente/nueva")({
  head: () => ({ meta: [{ title: "Nueva reserva — Royalty House" }] }),
  component: () => {
    const navigate = useNavigate();
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold">Nueva reserva</h1>
        <ReservaBuilder onCreada={(id) => navigate({ to: "/cliente/reserva/$id", params: { id } })} />
      </div>
    );
  },
});
