import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { catalogoQuery, RESERVA_SELECT } from "@/lib/datos";
import { horaDe, mensajeError, puedeCancelar, rango, TIPO_LABEL } from "@/lib/negocio";
import type { ReservaFull } from "@/lib/reserva";
import { EstadoBadge } from "@/components/rh/EstadoBadge";

export const Route = createFileRoute("/_authenticated/cliente/")({
  head: () => ({ meta: [{ title: "Mis reservas — Royalty House" }] }),
  component: MisReservas,
});

function MisReservas() {
  const { sesion } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: cat } = useQuery(catalogoQuery);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["reservas", "mias", sesion.userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reservas").select(RESERVA_SELECT).eq("usuario_id", sesion.userId)
        .order("fecha", { ascending: false }).order("hora_inicio", { ascending: false });
      if (error) throw error;
      return data as unknown as ReservaFull[];
    },
  });
  const horasMin = cat?.config.horas_min_cancelacion ?? 2;

  async function cancelar(id: string) {
    const { error } = await supabase.rpc("cancelar_reserva", { p_id: id });
    if (error) return toast.error(mensajeError(error));
    toast.success("Reserva cancelada.");
    qc.invalidateQueries({ queryKey: ["reservas"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-4xl font-semibold">Mis reservas</h1>
        <Button asChild><Link to="/cliente/nueva">Nueva reserva</Link></Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">Cargando…</p> : isError ? (
        <Card><CardContent className="space-y-3 py-6 text-destructive">
          <p>No se pudieron cargar tus reservas: {error instanceof Error ? error.message : "Error desconocido consultando Supabase."}</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>Reintentar</Button>
        </CardContent></Card>
      ) : !data?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aún no tienes reservas.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((r) => {
            const ok = puedeCancelar(r.fecha, r.hora_inicio, horasMin);
            return (
              <Card key={r.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to="/cliente/reserva/$id" params={{ id: r.id }} className="font-mono text-lg font-semibold text-primary hover:underline">{r.codigo}</Link>
                      <p className="text-sm">{r.recursos?.nombre} · {r.recursos ? TIPO_LABEL[r.recursos.tipo] : ""}</p>
                      {r.peliculas && <p className="text-sm text-muted-foreground">{r.peliculas.titulo}{r.personas != null && ` · ${r.personas} asistentes`}</p>}
                      <p className="text-sm text-muted-foreground">{r.fecha} · {rango(horaDe(r.hora_inicio), r.bloques)}</p>
                    </div>
                    <EstadoBadge estado={r.estado} />
                  </div>
                  {r.estado === "CONFIRMADA" && (
                    ok ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="sm">Cancelar</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Cancelar la reserva {r.codigo}?</AlertDialogTitle>
                            <AlertDialogDescription>El horario quedará libre para otros clientes.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Volver</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelar(r.id)}>Sí, cancelar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <div className="space-y-1">
                        <Button variant="outline" size="sm" disabled>Cancelar</Button>
                        <p className="text-xs text-muted-foreground">Solo puedes cancelar hasta {horasMin} horas antes del inicio.</p>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
