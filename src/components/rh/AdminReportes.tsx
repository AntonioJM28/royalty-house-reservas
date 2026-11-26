import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reporteQuery, rangoValido } from '@/lib/admin-reglas';
import { adminError } from '@/lib/admin';
import { TIPO_LABEL, bs, hoyLaPaz } from '@/lib/negocio';

const chartConfig = { ingresos_reservas: { label: 'Reservas', color: 'var(--chart-1)' }, ingresos_consumos: { label: 'Candy bar', color: 'var(--chart-2)' } } satisfies ChartConfig;
function restarDias(f: string, n: number) { const d = new Date(`${f}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
const corta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

export function AdminReportes() {
  const hoy = hoyLaPaz();
  const [rango, setRango] = useState({ desde: restarDias(hoy, 6), hasta: hoy });
  const [aviso, setAviso] = useState('');
  const q = useQuery(reporteQuery(rango.desde, rango.hasta));
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget); const desde = String(fd.get('desde')); const hasta = String(fd.get('hasta'));
    const err = rangoValido(desde, hasta); setAviso(err ?? ''); if (!err) setRango({ desde, hasta });
  }
  const r = q.data;
  const totR = r?.por_dia.reduce((s, d) => s + Number(d.ingresos_reservas), 0) ?? 0;
  const totC = r?.por_dia.reduce((s, d) => s + Number(d.ingresos_consumos), 0) ?? 0;
  return <section className="space-y-6">
    <div><h1 className="font-display text-4xl font-semibold">Reportes</h1><p className="mt-1 text-sm text-muted-foreground">Ocupación e ingresos estimados (reservas finalizadas y consumos registrados).</p></div>
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2"><Label htmlFor="desde">Desde</Label><Input id="desde" name="desde" type="date" defaultValue={rango.desde} required /></div>
      <div className="space-y-2"><Label htmlFor="hasta">Hasta</Label><Input id="hasta" name="hasta" type="date" defaultValue={rango.hasta} required /></div>
      <Button type="submit">{q.isFetching ? <LoaderCircle className="animate-spin" /> : <Search />}Ver reporte</Button>
      {aviso && <p role="alert" className="w-full text-sm text-destructive">{aviso}</p>}
    </form>
    {q.isError && <p role="alert" className="text-sm text-destructive">{adminError(q.error)}</p>}
    {q.isPending && <p className="text-sm text-muted-foreground">Cargando reporte…</p>}
    {r && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Ocupación total" valor={`${r.ocupacion_pct}%`} />
        <Kpi label="Ingresos totales" valor={bs(totR + totC)} />
        <Kpi label="Por reservas" valor={bs(totR)} />
        <Kpi label="Por candy bar" valor={bs(totC)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">{r.por_tipo.map(t => <div key={t.tipo} className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{TIPO_LABEL[t.tipo]}</p><p className="font-display text-2xl font-semibold">{t.ocupacion_pct}% ocupación</p><p className="text-sm">{bs(Number(t.ingresos))} en reservas</p><div className="mt-3 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, t.ocupacion_pct)}%` }} /></div></div>)}</div>
      <div className="rounded-lg border border-border bg-card p-4"><h2 className="mb-3 font-display text-2xl font-semibold">Ingresos por día</h2>
        <ChartContainer config={chartConfig} className="h-64 w-full"><BarChart data={r.por_dia.map(d => ({ ...d, ingresos_reservas: Number(d.ingresos_reservas), ingresos_consumos: Number(d.ingresos_consumos), dia: corta(d.fecha) }))}><CartesianGrid vertical={false} /><XAxis dataKey="dia" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={48} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} /><Bar dataKey="ingresos_reservas" stackId="a" fill="var(--color-ingresos_reservas)" /><Bar dataKey="ingresos_consumos" stackId="a" fill="var(--color-ingresos_consumos)" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer>
      </div>
      <div className="rounded-lg border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead className="text-right">Reservas</TableHead><TableHead className="text-right">Candy bar</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
        <TableBody>{r.por_dia.map(d => <TableRow key={d.fecha}><TableCell>{corta(d.fecha)}/{d.fecha.slice(0, 4)}</TableCell><TableCell className="text-right">{bs(Number(d.ingresos_reservas))}</TableCell><TableCell className="text-right">{bs(Number(d.ingresos_consumos))}</TableCell><TableCell className="text-right font-medium">{bs(Number(d.ingresos_reservas) + Number(d.ingresos_consumos))}</TableCell></TableRow>)}</TableBody>
        <TableFooter><TableRow><TableCell>Total</TableCell><TableCell className="text-right">{bs(totR)}</TableCell><TableCell className="text-right">{bs(totC)}</TableCell><TableCell className="text-right">{bs(totR + totC)}</TableCell></TableRow></TableFooter></Table></div>
    </>}
  </section>;
}
function Kpi({ label, valor }: { label: string; valor: string }) { return <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="font-display text-3xl font-semibold">{valor}</p></div>; }
