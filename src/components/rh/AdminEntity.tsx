import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { adminCatalogQuery, adminPersonalQuery, guardarEntidad, cambiarActividad, adminError, type AdminKind, type AdminSearch } from '@/lib/admin';
import { TIPO_LABEL, bs } from '@/lib/negocio';

type Row = { id: string; nombre?: string; tipo?: string; capacidad?: number; titulo?: string; duracion_min?: number; precio?: number; existencias?: number; activo?: boolean; en_cartelera?: boolean; correo?: string; rol?: string };
const titles: Record<AdminKind, { title: string; singular: string }> = {
  mesas: { title: 'Mesas de billar', singular: 'mesa' }, salas: { title: 'Salas de minicine', singular: 'sala' }, peliculas: { title: 'Películas', singular: 'película' }, productos: { title: 'Productos del candy bar', singular: 'producto' }, personal: { title: 'Personal autorizado', singular: 'persona' },
};
const displayName = (r: Row) => r.nombre ?? r.titulo ?? r.correo ?? '';
const isActive = (r: Row) => r.activo ?? r.en_cartelera ?? true;

export function AdminCatalog({ kind, search, onSearch }: { kind: Exclude<AdminKind, 'personal'>; search: AdminSearch; onSearch: (s: AdminSearch) => void }) {
  const { data } = useSuspenseQuery(adminCatalogQuery);
  const rows: Row[] = kind === 'mesas' || kind === 'salas' ? data.recursos.filter(r => (r.tipo === 'SALA_MINICINE') === (kind === 'salas')) : kind === 'peliculas' ? data.peliculas : data.productos;
  return <EntityManager kind={kind} rows={rows} search={search} onSearch={onSearch} />;
}
export function AdminPersonal({ search, onSearch, ownEmail }: { search: AdminSearch; onSearch: (s: AdminSearch) => void; ownEmail: string }) {
  const { data } = useSuspenseQuery(adminPersonalQuery);
  return <EntityManager kind="personal" rows={data.map(r => ({ ...r, id: r.correo }))} search={search} onSearch={onSearch} ownEmail={ownEmail} />;
}
function EntityManager({ kind, rows, search, onSearch, ownEmail = '' }: { kind: AdminKind; rows: Row[]; search: AdminSearch; onSearch: (s: AdminSearch) => void; ownEmail?: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null | undefined>();
  const [removing, setRemoving] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['admin-catalog'] }), qc.invalidateQueries({ queryKey: ['admin-personal'] }), qc.invalidateQueries({ queryKey: ['catalogo'] })]); };
  const save = useMutation({ mutationFn: (input: unknown) => guardarEntidad(kind, editing?.id ?? null, input), onSuccess: async () => { await refresh(); setEditing(undefined); toast.success('Cambios guardados.'); }, onError: e => setError(adminError(e)) });
  const activity = useMutation({ mutationFn: ({ row, active }: { row: Row; active: boolean }) => cambiarActividad(kind, row.id, active), onSuccess: async () => { await refresh(); setRemoving(null); toast.success(kind === 'personal' ? 'Acceso de personal retirado.' : 'Estado actualizado.'); }, onError: e => toast.error(adminError(e)) });
  const visible = rows.filter(r => displayName(r).toLocaleLowerCase('es').includes((search.q ?? '').toLocaleLowerCase('es')) && ((search.estado ?? 'todos') === 'todos' || isActive(r) === (search.estado === 'activos')));
  const open = (row: Row | null) => { setError(''); setEditing(row); };
  const busy = save.isPending || activity.isPending;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = new FormData(e.currentTarget);
    const input = Object.fromEntries(form);
    save.mutate({ ...input, activo: form.get('activo') === 'on', en_cartelera: form.get('en_cartelera') === 'on' });
  }
  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-4xl font-semibold">{titles[kind].title}</h1><p className="mt-1 text-sm text-muted-foreground">{rows.length} {kind === 'personal' ? 'correos autorizados' : 'registros'}{kind !== 'personal' && ` · ${rows.filter(isActive).length} activos`}</p></div><Button onClick={() => open(null)}><Plus />{kind === 'personal' ? 'Agregar personal' : `Nueva ${kind === 'productos' ? 'alta de producto' : titles[kind].singular}`}</Button></div>
    <div className="flex flex-wrap gap-3"><div className="relative min-w-0 flex-1 basis-56"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar registros" placeholder={kind === 'personal' ? 'Buscar correo…' : 'Buscar por nombre…'} className="pl-9" value={search.q ?? ''} onChange={e => onSearch({ ...search, q: e.target.value })} /></div>{kind !== 'personal' && <Select value={search.estado ?? 'todos'} onValueChange={estado => onSearch({ ...search, estado: estado === 'activos' || estado === 'inactivos' ? estado : 'todos' })}><SelectTrigger className="w-40" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los estados</SelectItem><SelectItem value="activos">Activos</SelectItem><SelectItem value="inactivos">Inactivos</SelectItem></SelectContent></Select>}</div>
    <div className="border-y border-border">
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem_5rem] gap-4 border-b border-border py-3 text-xs uppercase text-muted-foreground sm:grid"><span>{kind === 'personal' ? 'Correo' : 'Nombre'}</span><span>{kind === 'personal' ? 'Rol' : 'Detalles'}</span><span>{kind === 'personal' ? 'Acceso' : 'Estado'}</span><span className="text-right">Acciones</span></div>
      {visible.map(row => <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-border py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem_5rem]">
        <div className="min-w-0 break-words font-medium">{displayName(row)}{row.correo === ownEmail && <span className="ml-2 text-xs text-primary">Tu cuenta</span>}</div>
        <div className="col-start-1 row-start-2 min-w-0 text-sm text-muted-foreground sm:col-auto sm:row-auto">{(kind === 'mesas' || kind === 'salas') && <>{row.tipo === 'MESA_VIP' ? 'VIP' : row.tipo === 'MESA_NORMAL' ? 'Normal' : 'Sala privada'} · {row.capacidad} personas</>}{kind === 'peliculas' && <>{row.duracion_min} min · {Math.ceil((row.duracion_min ?? 0) / 60)} bloques</>}{kind === 'productos' && <>{bs(row.precio ?? 0)} · <span className={row.existencias === 0 ? 'text-destructive' : ''}>{row.existencias} en stock</span></>}{kind === 'personal' && (row.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Recepcionista')}</div>
        <div className="col-start-1 row-start-3 flex items-center gap-2 text-sm sm:col-auto sm:row-auto">{kind === 'personal' ? <span className="text-primary">Autorizado</span> : <><Switch aria-label={`${isActive(row) ? 'Desactivar' : 'Activar'} ${displayName(row)}`} checked={isActive(row)} disabled={busy} onCheckedChange={active => activity.mutate({ row, active })} /><span className={isActive(row) ? 'text-primary' : 'text-muted-foreground'}>{kind === 'peliculas' ? isActive(row) ? 'En cartelera' : 'Fuera de cartelera' : isActive(row) ? 'Activo' : 'Inactivo'}</span></>}</div>
        <div className="col-start-2 row-span-3 row-start-1 flex justify-end gap-1 sm:col-auto sm:row-auto sm:row-span-1"><Button variant="ghost" size="icon" title={`Editar ${displayName(row)}`} aria-label={`Editar ${displayName(row)}`} disabled={busy || (kind === 'personal' && row.correo === ownEmail)} onClick={() => open(row)}><Pencil /></Button>{kind === 'personal' && <Button variant="ghost" size="icon" className="text-destructive" title={`Quitar ${displayName(row)}`} aria-label={`Quitar ${displayName(row)}`} disabled={busy || row.correo === ownEmail} onClick={() => setRemoving(row)}><Trash2 /></Button>}</div>
      </div>)}
      {!visible.length && <div className="py-14 text-center"><p className="font-medium">{rows.length ? 'Sin resultados' : 'Todavía no hay registros'}</p><p className="mt-1 text-sm text-muted-foreground">{rows.length ? 'Prueba con otro nombre o estado.' : 'Agrega el primer registro.'}</p></div>}
    </div>
    <Dialog open={editing !== undefined} onOpenChange={open => { if (!open && !save.isPending) setEditing(undefined); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg"><DialogHeader><DialogTitle>{editing ? 'Editar' : 'Agregar'} {titles[kind].singular}</DialogTitle><DialogDescription>{kind === 'personal' ? 'El correo debe coincidir con la cuenta de Google del personal.' : 'Datos del registro'}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4" key={editing?.id ?? 'new'}>
          <fieldset disabled={save.isPending} className="space-y-4">
            {(kind === 'mesas' || kind === 'salas' || kind === 'productos') && <Field name="nombre" label="Nombre" defaultValue={editing?.nombre ?? ''} />}
            {(kind === 'mesas' || kind === 'salas') && <><div className="space-y-2"><Label htmlFor="tipo">Tipo</Label>{kind === 'salas' ? <><Input id="tipo" value="Sala de minicine" disabled /><input type="hidden" name="tipo" value="SALA_MINICINE" /></> : <Select name="tipo" defaultValue={editing?.tipo ?? 'MESA_NORMAL'}><SelectTrigger id="tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MESA_NORMAL">{TIPO_LABEL.MESA_NORMAL}</SelectItem><SelectItem value="MESA_VIP">{TIPO_LABEL.MESA_VIP}</SelectItem></SelectContent></Select>}</div><Field name="capacidad" label="Capacidad (personas)" type="number" min={1} {...(kind === 'salas' ? { max: 7 } : {})} defaultValue={editing?.capacidad ?? (kind === 'salas' ? 7 : 4)} /></>}
            {kind === 'peliculas' && <><Field name="titulo" label="Título" defaultValue={editing?.titulo ?? ''} /><Field name="duracion_min" label="Duración (minutos)" type="number" min={1} defaultValue={editing?.duracion_min ?? 120} /></>}
            {kind === 'productos' && <div className="grid grid-cols-2 gap-4"><Field name="precio" label="Precio (Bs)" type="number" min={0} step="0.01" defaultValue={editing?.precio ?? 0} /><Field name="existencias" label="Existencias" type="number" min={0} defaultValue={editing?.existencias ?? 0} /></div>}
            {kind === 'personal' && <><Field name="correo" label="Correo de Google" type="email" readOnly={!!editing} defaultValue={editing?.correo ?? ''} /><div className="space-y-2"><Label htmlFor="rol">Rol</Label><Select name="rol" defaultValue={editing?.rol ?? 'RECEPCIONISTA'}><SelectTrigger id="rol"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="RECEPCIONISTA">Recepcionista</SelectItem><SelectItem value="ADMINISTRADOR">Administrador</SelectItem></SelectContent></Select></div></>}
            {kind !== 'personal' && <div className="flex items-center justify-between"><Label htmlFor="activo">{kind === 'peliculas' ? 'En cartelera' : 'Activo'}</Label><Switch id="activo" name={kind === 'peliculas' ? 'en_cartelera' : 'activo'} defaultChecked={editing ? isActive(editing) : true} /></div>}
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setEditing(undefined)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending && <LoaderCircle className="animate-spin" />}Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !activity.isPending) setRemoving(null); }}><DialogContent className="w-[calc(100%-2rem)] rounded-lg"><DialogHeader><DialogTitle>Quitar acceso de personal</DialogTitle><DialogDescription className="break-words">{removing?.correo} dejará de tener acceso a recepción y administración. Sus reservas no se eliminarán.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={activity.isPending} onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="destructive" disabled={activity.isPending} onClick={() => { if (removing) activity.mutate({ row: removing, active: false }); }}>{activity.isPending && <LoaderCircle className="animate-spin" />}Quitar acceso</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div className="min-w-0 space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} required {...props} /></div>;
}
