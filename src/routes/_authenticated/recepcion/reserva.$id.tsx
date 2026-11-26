import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { catalogoQuery } from "@/lib/datos";
import { bs, mensajeError } from "@/lib/negocio";
import { reservaQuery } from "@/lib/reserva";
import { Confirmacion } from "@/components/rh/Confirmacion";
import { AccionesEstado } from "@/components/rh/AccionesEstado";

export const Route = createFileRoute("/_authenticated/recepcion/reserva/$id")({
  head: () => ({ meta: [{ title: "Detalle de reserva — Royalty House" }] }),
  component: Detalle,
});

function Detalle() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery(reservaQuery(id));
  const {
    data: cat,
    isLoading: isLoadingCatalogo,
    isError: isCatalogoError,
    error: catalogoError,
    refetch: refetchCatalogo,
  } = useQuery(catalogoQuery);
  const [prod, setProd] = useState("");
  const [cant, setCant] = useState(1);
  const [enviando, setEnviando] = useState(false);
  if (isLoading || isLoadingCatalogo) return <p className="text-muted-foreground">Cargando…</p>;
  if (isError) {
    return (
      <div className="space-y-3">
        <p role="alert">
          No se pudo consultar la reserva:{" "}
          {mensajeError(error)}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (isCatalogoError || !cat) {
    return (
      <div className="space-y-3">
        <p role="alert">
          No se pudo cargar el catálogo:{" "}
          {mensajeError(catalogoError)}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetchCatalogo()}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (!data?.reserva) return <p>No se encontró la reserva.</p>;
  const r = data.reserva;
  const esCine = r.recursos?.tipo === "SALA_MINICINE";
  const productos = cat.productos.filter((p) => p.activo);
  const p = productos.find((x) => x.id === prod);
  const sinStock = !!p && p.existencias < cant;
  const totalConsumo = data.consumos.reduce((s, c) => s + c.cantidad * Number(c.precio_unitario), 0);

  async function registrar() {
    if (!p) return;
    setEnviando(true);
    const { error } = await supabase.rpc("registrar_consumo", { p_reserva_id: r.id, p_producto_id: p.id, p_cantidad: cant });
    setEnviando(false);
    if (error) return toast.error(mensajeError(error));
    toast.success("Consumo registrado.");
    setCant(1);
    qc.invalidateQueries({ queryKey: ["reservas"] });
    qc.invalidateQueries({ queryKey: ["catalogo"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Confirmacion reserva={r} pedido={data.pedido} />
        <div className="flex justify-center"><AccionesEstado r={r} tolerancia={cat.config.minutos_tolerancia} /></div>
      </div>
      {esCine && (
        <Card className="h-fit">
          <CardHeader><CardTitle className="font-display text-2xl">Consumos del candy bar</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {r.estado === "EN_USO" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_90px_auto] sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor="prod">Producto</Label>
                  <select id="prod" value={prod} onChange={(e) => setProd(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3">
                    <option value="">Elige…</option>
                    {productos.map((x) => (
                      <option key={x.id} value={x.id} disabled={x.existencias === 0}>{x.nombre} — {bs(Number(x.precio))} · {x.existencias === 0 ? "sin stock" : `${x.existencias} en stock`}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cant">Cantidad</Label>
                  <Input id="cant" type="number" min={1} value={cant} onChange={(e) => setCant(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <Button onClick={registrar} disabled={!p || sinStock || enviando}>Registrar</Button>
                {sinStock && <p className="text-destructive sm:col-span-3">No hay existencias suficientes (quedan {p?.existencias}).</p>}
              </div>
            ) : (
              <p className="rounded-md bg-muted p-3 text-muted-foreground">Los consumos se registran cuando la reserva está en uso.</p>
            )}
            <div className="border-t border-border pt-3">
              {data.consumos.length === 0 ? <p className="text-muted-foreground">Sin consumos registrados.</p> : data.consumos.map((c) => (
                <div key={c.id} className="flex justify-between"><span>{c.cantidad} × {c.productos?.nombre}</span><span>{bs(c.cantidad * Number(c.precio_unitario))}</span></div>
              ))}
              {data.consumos.length > 0 && <div className="mt-2 flex justify-between font-semibold"><span>Total consumos</span><span>{bs(totalConsumo)}</span></div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
