import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Save, LoaderCircle, Target, Crown, Clapperboard } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminCatalogQuery, guardarTarifa, adminError } from '@/lib/admin';
import { TIPO_LABEL, type TipoRecurso } from '@/lib/negocio';

export function AdminTarifas() {
  const { data } = useSuspenseQuery(adminCatalogQuery);
  return <section className="space-y-6"><div><h1 className="font-display text-4xl font-semibold">Tarifas de reservas</h1><p className="mt-1 text-sm text-muted-foreground">Precios en bolivianos</p></div><div className="grid gap-4 md:grid-cols-3">{(['MESA_NORMAL', 'MESA_VIP', 'SALA_MINICINE'] as const).map(tipo => <Tarifa key={`${tipo}-${data.tarifas.find(t => t.tipo === tipo)?.precio_hora}`} tipo={tipo} precio={data.tarifas.find(t => t.tipo === tipo)?.precio_hora ?? 0} />)}</div></section>;
}
function Tarifa({ tipo, precio }: { tipo: TipoRecurso; precio: number }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const Icon = tipo === 'MESA_NORMAL' ? Target : tipo === 'MESA_VIP' ? Crown : Clapperboard;
  const mutation = useMutation({ mutationFn: guardarTarifa, onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['admin-catalog'] }), qc.invalidateQueries({ queryKey: ['catalogo'] })]); toast.success('Tarifa guardada.'); }, onError: e => setError(adminError(e)) });
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); mutation.mutate({ tipo, precio_hora: new FormData(e.currentTarget).get('precio') }); }
  return <form onSubmit={submit} className="space-y-5 rounded-lg border border-border bg-card p-5"><Icon className="h-6 w-6 text-primary" /><h2 className="font-display text-2xl font-semibold">{TIPO_LABEL[tipo]}</h2><div className="space-y-2"><Label htmlFor={`precio-${tipo}`}>{tipo === 'SALA_MINICINE' ? 'Bs por persona' : 'Bs por hora'}</Label><Input id={`precio-${tipo}`} name="precio" type="number" required min={0} step="0.01" defaultValue={precio} disabled={mutation.isPending} className="text-lg" /></div><p className="min-h-10 text-sm text-muted-foreground">{tipo === 'SALA_MINICINE' ? 'Hasta 7 asistentes. El precio no depende de la duración de la película.' : 'El total corresponde a las horas reservadas.'}</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" variant="outline" disabled={mutation.isPending} className="w-full">{mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}Guardar tarifa</Button></form>;
}
