import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { catalogoQuery, RESERVA_SELECT } from "@/lib/datos";
import { hoyLaPaz, horaDe, rango, TIPO_LABEL } from "@/lib/negocio";
import type { ReservaFull } from "@/lib/reserva";
import { EstadoBadge } from "@/components/rh/EstadoBadge";
import { AccionesEstado } from "@/components/rh/AccionesEstado";

export const Route = createFileRoute("/_authenticated/recepcion/")({
  head: () => ({ meta: [{ title: "Panel del día — Royalty House" }] }),
  component: Panel,
});

function Panel() {
  const [busca, setBusca] = useState("");
  const hoy = hoyLaPaz();
  const { data: cat } = useQuery(catalogoQuery);
  const termino = busca.trim().replace(/[%,()]/g, "");
  const { data, isLoading } = useQuery({
    queryKey: ["reservas", "panel", hoy, termino],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = supabase.from("reservas").select(RESERVA_SELECT);
      q = termino ? q.or(`codigo.ilike.%${termino}%,nombre_cliente.ilike.%${termino}%`).order("fecha", { ascending: false }).limit(50)
        : q.eq("fecha", hoy);
      const { data, error } = await q.order("hora_inicio");
      if (error) throw error;
      return data as unknown as ReservaFull[];
    },
  });
  const tol = cat?.config.minutos_tolerancia ?? 15;
  const recursos = (cat?.recursos ?? []).filter((r) => r.activo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Panel del día</h1>
          <p className="text-sm text-muted-foreground">{termino ? "Resultados de búsqueda (todas las fechas)" : `Reservas de hoy, ${hoy}`}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por código o nombre" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">Cargando…</p> : termino ? (
        <Lista items={data ?? []} tol={tol} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recursos.map((rec) => {
            const items = (data ?? []).filter((r) => r.recurso_id === rec.id);
            return (
              <Card key={rec.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-2xl font-semibold">{rec.nombre}</h2>
                    <span className="text-xs text-muted-foreground">{TIPO_LABEL[rec.tipo]}</span>
                  </div>
                  {items.length ? <Lista items={items} tol={tol} compacto /> : <p className="text-sm text-muted-foreground">Sin reservas hoy.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Lista({ items, tol, compacto }: { items: ReservaFull[]; tol: number; compacto?: boolean }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Sin resultados.</p>;
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <div key={r.id} className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              <Link to="/recepcion/reserva/$id" params={{ id: r.id }} className="font-mono font-semibold text-primary hover:underline">{r.codigo}</Link>
              <span className="ml-2">{rango(horaDe(r.hora_inicio), r.bloques)}</span>
              <p>{r.nombre_cliente} · <span className="text-muted-foreground">{r.telefono_cliente}</span></p>
              {!compacto && <p className="text-muted-foreground">{r.fecha} · {r.recursos?.nombre}</p>}
              {r.peliculas && <p className="text-muted-foreground">{r.peliculas.titulo}</p>}
            </div>
            <EstadoBadge estado={r.estado} />
          </div>
          <AccionesEstado r={r} tolerancia={tol} />
        </div>
      ))}
    </div>
  );
}
