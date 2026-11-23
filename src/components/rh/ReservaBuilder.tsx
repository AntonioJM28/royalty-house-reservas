import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clapperboard, Minus, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { catalogoQuery, ocupacionQuery } from "@/lib/datos";
import {
  bloquesPelicula, bs, costoEstimado, costoMinicine, MAX_PERSONAS_MINICINE, hh, hoyLaPaz, horaDe, inicioDisponible, mensajeError, rango,
  TIPO_LABEL, type TipoRecurso,
} from "@/lib/negocio";
import { cn } from "@/lib/utils";

type Servicio = "billar" | "minicine";

export function ReservaBuilder({ mostrador, onCreada }: { mostrador?: boolean; onCreada: (id: string) => void }) {
  const qc = useQueryClient();
  const { data: cat, isLoading } = useQuery(catalogoQuery);
  const [servicio, setServicio] = useState<Servicio>("billar");
  const [fecha, setFecha] = useState(hoyLaPaz());
  const [peliculaId, setPeliculaId] = useState<string | null>(null);
  const [duracion, setDuracion] = useState(1);
  const [personas, setPersonas] = useState(2);
  const [sel, setSel] = useState<{ recursoId: string; inicio: number } | null>(null);
  const [candy, setCandy] = useState<Record<string, number>>({});
  const [nombre, setNombre] = useState("");
  const [tel, setTel] = useState("");
  const [enviando, setEnviando] = useState(false);

  const tipos: TipoRecurso[] = servicio === "billar" ? ["MESA_NORMAL", "MESA_VIP"] : ["SALA_MINICINE"];
  const ocup = useQuery({ ...ocupacionQuery(fecha, tipos), refetchInterval: 30_000 });

  const pelicula = cat?.peliculas.find((p) => p.id === peliculaId && p.en_cartelera);
  const bloques = servicio === "minicine" ? (pelicula ? bloquesPelicula(pelicula.duracion_min) : 0) : duracion;
  const apertura = cat ? horaDe(cat.horario.hora_apertura) : 0;
  const cierre = cat ? horaDe(cat.horario.hora_cierre) : 0;
  const horas = useMemo(() => Array.from({ length: Math.max(0, cierre - apertura) }, (_, i) => apertura + i), [apertura, cierre]);
  const recursos = (cat?.recursos ?? []).filter((r) => r.activo && tipos.includes(r.tipo));
  const ocupadosPor = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const o of ocup.data ?? []) {
      if (!m.has(o.recurso_id)) m.set(o.recurso_id, new Set());
      m.get(o.recurso_id)!.add(o.bloque);
    }
    return m;
  }, [ocup.data]);

  const listo = bloques > 0;
  const now = Date.now();
  const hayLibres =
    listo &&
    recursos.some((r) =>
      horas.some((h) => inicioDisponible({ inicio: h, bloques, apertura, cierre, ocupados: ocupadosPor.get(r.id) ?? new Set(), fecha, now })),
    );

  function reset() {
    setSel(null);
  }

  if (isLoading || !cat) return <p className="text-muted-foreground">Cargando…</p>;

  const recursoSel = cat.recursos.find((r) => r.id === sel?.recursoId);
  const productosActivos = cat.productos.filter((p) => p.activo);
  const items = productosActivos
    .filter((p) => (candy[p.id] ?? 0) > 0)
    .map((p) => ({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: candy[p.id] ?? 0 }));
  const total = recursoSel ? (servicio === "minicine" ? costoMinicine(cat.tarifa(recursoSel.tipo), personas, items) : costoEstimado(cat.tarifa(recursoSel.tipo), bloques)) : 0;

  async function confirmar() {
    if (!sel) return;
    if (mostrador && (!nombre.trim() || !tel.trim())) return toast.error("Ingresa el nombre y teléfono del cliente.");
    setEnviando(true);
    const { data, error } = await supabase.rpc("crear_reserva", {
      p_recurso_id: sel.recursoId,
      p_fecha: fecha,
      p_hora_inicio: hh(sel.inicio),
      p_bloques: bloques,
      p_pelicula_id: servicio === "minicine" ? peliculaId : undefined,
      p_nombre_cliente: mostrador ? nombre.trim() : undefined,
      p_telefono_cliente: mostrador ? tel.trim() : undefined,
      p_productos: servicio === "minicine" ? items.map(({ producto_id, cantidad }) => ({ producto_id, cantidad })) : [],
      p_personas: servicio === "minicine" ? personas : undefined,
    } as never);
    setEnviando(false);
    if (error) {
      toast.error(mensajeError(error));
      if (error.message.includes("HORARIO_OCUPADO")) {
        setSel(null);
        qc.invalidateQueries({ queryKey: ["ocupacion"] });
      }
      return;
    }
    qc.invalidateQueries({ queryKey: ["ocupacion"] });
    qc.invalidateQueries({ queryKey: ["reservas"] });
    const r = data as unknown as { id: string };
    onCreada(r.id);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Servicio</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["billar", "minicine"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setServicio(s); reset(); setCandy({}); }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
                      servicio === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary",
                    )}
                  >
                    {s === "billar" ? <Target className="h-4 w-4" /> : <Clapperboard className="h-4 w-4" />}
                    {s === "billar" ? "Billar" : "Minicine"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" min={hoyLaPaz()} value={fecha} onChange={(e) => { if (e.target.value >= hoyLaPaz()) { setFecha(e.target.value); reset(); } }} />
            </div>
            {servicio === "billar" ? (
              <div className="space-y-2">
                <Label>Duración</Label>
                <div className="flex gap-2">
                  {Array.from({ length: cat.config.max_bloques_billar }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => { setDuracion(n); reset(); }}
                      className={cn("h-10 flex-1 rounded-md border text-sm", duracion === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary")}>
                      {n} h
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="peli">Película</Label>
                <select id="peli" value={peliculaId ?? ""} onChange={(e) => { setPeliculaId(e.target.value || null); reset(); }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Elige una película…</option>
                  {cat.peliculas.filter((p) => p.en_cartelera).map((p) => (
                    <option key={p.id} value={p.id}>{p.titulo} ({p.duracion_min} min · {bloquesPelicula(p.duracion_min)} h)</option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Disponibilidad</CardTitle>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-libre" /> Libre</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-ocupado border border-border" /> Ocupado / no disponible</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary" /> Tu selección</span>
            </div>
          </CardHeader>
          <CardContent>
            {!listo ? (
              <p className="py-6 text-center text-muted-foreground">Elige una película para ver los horarios.</p>
            ) : (
              <>
                {!hayLibres && !ocup.isLoading && (
                  <p className="mb-3 rounded-md bg-muted p-3 text-sm">No hay horarios libres este día para la duración elegida. Prueba otra fecha.</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-1 text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-card text-left font-medium text-muted-foreground">Recurso</th>
                        {horas.map((h) => <th key={h} className="min-w-11 font-normal text-muted-foreground">{hh(h)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {recursos.map((r) => {
                        const ocupados = ocupadosPor.get(r.id) ?? new Set<number>();
                        return (
                          <tr key={r.id}>
                            <td className="sticky left-0 whitespace-nowrap bg-card pr-2 text-sm">
                              <div className="font-medium">{r.nombre}</div>
                              <div className="text-[11px] text-muted-foreground">{TIPO_LABEL[r.tipo]} · {r.capacidad} pers.</div>
                            </td>
                            {horas.map((h) => {
                              const enSel = sel?.recursoId === r.id && h >= sel.inicio && h < sel.inicio + bloques;
                              const ok = inicioDisponible({ inicio: h, bloques, apertura, cierre, ocupados, fecha, now });
                              const ocupado = ocupados.has(h);
                              return (
                                <td key={h}>
                                  <button
                                    type="button"
                                    disabled={!ok}
                                    aria-label={`${r.nombre} ${hh(h)}`}
                                    title={ocupado ? "Ocupado" : ok ? `Reservar ${rango(h, bloques)}` : "No disponible"}
                                    onClick={() => setSel({ recursoId: r.id, inicio: h })}
                                    className={cn(
                                      "h-9 w-full rounded-md text-[11px] transition-colors",
                                      enSel ? "bg-primary text-primary-foreground"
                                        : ok ? "bg-libre text-libre-foreground hover:brightness-125"
                                        : "cursor-not-allowed bg-ocupado text-ocupado-foreground",
                                    )}
                                  >
                                    {ocupado ? "×" : ""}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader><CardTitle className="font-display text-2xl">Resumen</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!sel || !recursoSel ? (
            <p className="text-muted-foreground">Selecciona un horario libre en la grilla.</p>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Recurso</dt><dd>{recursoSel.nombre}</dd>
                <dt className="text-muted-foreground">Modalidad</dt><dd>{TIPO_LABEL[recursoSel.tipo]}</dd>
                {pelicula && servicio === "minicine" && (<><dt className="text-muted-foreground">Película</dt><dd>{pelicula.titulo}</dd></>)}
                <dt className="text-muted-foreground">Fecha</dt><dd>{fecha}</dd>
                <dt className="text-muted-foreground">Hora</dt><dd>{rango(sel.inicio, bloques)}</dd>
                {servicio === "minicine" ? (<>
                  <dt className="text-muted-foreground">Duración</dt><dd>{bloques} h</dd>
                  <dt className="text-muted-foreground">Personas</dt>
                  <dd className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Quitar persona" onClick={() => setPersonas((n) => Math.max(1, n - 1))}><Minus className="h-3 w-3" /></Button>
                    <span className="w-5 text-center">{personas}</span>
                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label="Agregar persona" onClick={() => setPersonas((n) => Math.min(MAX_PERSONAS_MINICINE, n + 1))}><Plus className="h-3 w-3" /></Button>
                    <span className="text-muted-foreground">× {bs(cat.tarifa(recursoSel.tipo))} (máx. {MAX_PERSONAS_MINICINE})</span>
                  </dd>
                </>) : (<><dt className="text-muted-foreground">Duración</dt><dd>{bloques} h × {bs(cat.tarifa(recursoSel.tipo))}</dd></>)}
              </dl>
              {servicio === "minicine" && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="font-medium">Candy bar (opcional)</p>
                  {productosActivos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <span>{p.nombre} <span className="text-muted-foreground">{bs(Number(p.precio))}</span></span>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label={`Quitar ${p.nombre}`}
                          onClick={() => setCandy((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}><Minus className="h-3 w-3" /></Button>
                        <span className="w-5 text-center">{candy[p.id] ?? 0}</span>
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label={`Agregar ${p.nombre}`}
                          onClick={() => setCandy((c) => ({ ...c, [p.id]: Math.min(20, (c[p.id] ?? 0) + 1) }))}><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {mostrador && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label htmlFor="nom">Nombre del cliente</Label>
                  <Input id="nom" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  <Label htmlFor="telc">Teléfono del cliente</Label>
                  <Input id="telc" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Costo estimado</span>
                <span className="font-display text-3xl font-semibold text-primary">{bs(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">El pago se realiza en efectivo en el local.</p>
              <Button className="w-full" onClick={confirmar} disabled={enviando}>{enviando ? "Reservando…" : "Confirmar reserva"}</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
