import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReservaBuilder } from "@/components/rh/ReservaBuilder";

export const Route = createFileRoute("/_authenticated/recepcion/mostrador")({
  head: () => ({ meta: [{ title: "Reserva en mostrador — Royalty House" }] }),
  component: () => {
    const navigate = useNavigate();
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold">Reserva en mostrador</h1>
        <ReservaBuilder mostrador onCreada={(id) => navigate({ to: "/recepcion/reserva/$id", params: { id } })} />
      </div>
    );
  },
});
