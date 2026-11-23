import { CheckCircle2, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { bs, horaDe, rango, TIPO_LABEL } from "@/lib/negocio";
import type { ReservaFull } from "@/lib/reserva";
import { EstadoBadge } from "./EstadoBadge";

export function Confirmacion({ reserva, pedido }: { reserva: ReservaFull; pedido: { id: string; cantidad: number; productos: { nombre: string; precio: number } | null }[] }) {
  return (
    <Card className="mx-auto max-w-lg overflow-hidden">
      <div className="bg-felt px-6 py-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-2 text-sm uppercase tracking-[0.25em] text-muted-foreground">Código de reserva</p>
        <p className="mt-1 select-all font-mono text-5xl font-bold tracking-[0.2em] text-primary">{reserva.codigo}</p>
        <div className="mt-3"><EstadoBadge estado={reserva.estado} /></div>
      </div>
      <CardContent className="space-y-4 pt-6 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-muted-foreground">Cliente</dt><dd>{reserva.nombre_cliente} · {reserva.telefono_cliente}</dd>
          <dt className="text-muted-foreground">Recurso</dt><dd>{reserva.recursos?.nombre} ({reserva.recursos ? TIPO_LABEL[reserva.recursos.tipo] : ""})</dd>
          {reserva.peliculas && (<><dt className="text-muted-foreground">Película</dt><dd>{reserva.peliculas.titulo}</dd></>)}
          {reserva.personas != null && (<><dt className="text-muted-foreground">Asistentes</dt><dd>{reserva.personas}</dd></>)}
          <dt className="text-muted-foreground">Fecha</dt><dd>{reserva.fecha}</dd>
          <dt className="text-muted-foreground">Horario</dt><dd>{rango(horaDe(reserva.hora_inicio), reserva.bloques)} ({reserva.bloques} h)</dd>
        </dl>
        {pedido.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-1 font-medium">Pedido de candy bar</p>
            {pedido.map((p) => (
              <div key={p.id} className="flex justify-between"><span>{p.cantidad} × {p.productos?.nombre}</span><span>{bs(p.cantidad * Number(p.productos?.precio ?? 0))}</span></div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-foreground">
          <Banknote className="h-5 w-5 shrink-0 text-primary" />
          El pago se realiza en efectivo en el local.
        </div>
      </CardContent>
    </Card>
  );
}
