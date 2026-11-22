import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Confirmacion } from "@/components/rh/Confirmacion";
import { reservaQuery } from "@/lib/reserva";

export const Route = createFileRoute("/_authenticated/cliente/reserva/$id")({
  head: () => ({ meta: [{ title: "Reserva confirmada — Royalty House" }] }),
  component: () => {
    const { id } = Route.useParams();
    const { data, isLoading } = useQuery(reservaQuery(id));
    if (isLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!data?.reserva) return <p>No se encontró la reserva.</p>;
    return (
      <div className="space-y-6">
        <Confirmacion reserva={data.reserva} pedido={data.pedido} />
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline"><Link to="/cliente">Mis reservas</Link></Button>
          <Button asChild><Link to="/cliente/nueva">Otra reserva</Link></Button>
        </div>
      </div>
    );
  },
});
