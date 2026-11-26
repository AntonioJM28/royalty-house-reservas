import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Save, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reglasQuery, guardarReglas } from '@/lib/admin-reglas';
import { adminError } from '@/lib/admin';

function Campo({ name, label, help, ...rest }: { name: string; label: string; help: string } & React.ComponentProps<typeof Input>) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} required {...rest} /><p className="text-xs text-muted-foreground">{help}</p></div>;
}
export function AdminReglas() {
  const { data } = useSuspenseQuery(reglasQuery);
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const m = useMutation({ mutationFn: guardarReglas, onSuccess: async () => { await qc.invalidateQueries(); toast.success('Horario y reglas guardados.'); }, onError: e => setError(adminError(e)) });
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); m.mutate(Object.fromEntries(new FormData(e.currentTarget))); }
  const { horario: h, config: c } = data;
  return <section className="space-y-6"><div><h1 className="font-display text-4xl font-semibold">Horario y reglas</h1><p className="mt-1 text-sm text-muted-foreground">Se aplican a todas las reservas nuevas.</p></div>
    <form onSubmit={submit} className="space-y-6 rounded-lg border border-border bg-card p-5">
      <fieldset disabled={m.isPending} className="space-y-6">
        <div><h2 className="mb-3 font-display text-2xl font-semibold">Horario de atención</h2><div className="grid gap-4 sm:grid-cols-2">
          <Campo name="hora_apertura" label="Apertura" type="time" step={3600} defaultValue={h.hora_apertura.slice(0, 5)} help="Primer bloque reservable." />
          <Campo name="hora_cierre" label="Cierre" type="time" step={3600} defaultValue={h.hora_cierre.slice(0, 5)} help="El último bloque termina a esta hora." />
        </div></div>
        <div><h2 className="mb-3 font-display text-2xl font-semibold">Reglas de reserva</h2><div className="grid gap-4 sm:grid-cols-2">
          <Campo name="horas_min_cancelacion" label="Plazo de cancelación (horas)" type="number" min={0} defaultValue={c.horas_min_cancelacion} help="Anticipación mínima para que el cliente cancele." />
          <Campo name="minutos_tolerancia" label="Tolerancia (minutos)" type="number" min={0} defaultValue={c.minutos_tolerancia} help="Después de esto, recepción puede marcar «no presentada»." />
          <Campo name="max_reservas_activas" label="Máximo de reservas activas" type="number" min={1} defaultValue={c.max_reservas_activas} help="Por cliente, contando solo reservas confirmadas y futuras." />
          <Campo name="max_bloques_billar" label="Duración máxima de billar (horas)" type="number" min={1} max={8} defaultValue={c.max_bloques_billar} help="Horas seguidas que se pueden reservar en una mesa." />
        </div></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={m.isPending}>{m.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}Guardar cambios</Button>
    </form></section>;
}
