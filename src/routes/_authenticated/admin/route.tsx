import { createFileRoute, Outlet, Link, redirect } from '@tanstack/react-router';
import { Target, Clapperboard, CircleDollarSign, Film, Popcorn, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { destinoInicial, esAdmin } from '@/lib/sesion';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ context }) => { if (!esAdmin(context.sesion.roles)) throw redirect({ to: destinoInicial(context.sesion) }); },
  component: AdminLayout,
});
function AdminLayout() {
  const links = [
    { to: '/admin', label: 'Mesas', icon: Target }, { to: '/admin/salas', label: 'Salas', icon: Clapperboard },
    { to: '/admin/tarifas', label: 'Tarifas', icon: CircleDollarSign }, { to: '/admin/peliculas', label: 'Películas', icon: Film },
    { to: '/admin/productos', label: 'Productos', icon: Popcorn }, { to: '/admin/personal', label: 'Personal', icon: Users },
  ] as const;
  return <div className="space-y-8"><div><p className="mb-3 text-sm font-medium text-primary">Administración · Royalty House</p><nav aria-label="Administración" className="flex flex-wrap gap-1 border-b border-border pb-3">{links.map(({ to, label, icon: Icon }) => <Button key={to} asChild variant="ghost"><Link to={to} activeOptions={{ exact: true }} activeProps={{ className: 'bg-secondary text-primary' }}><Icon />{label}</Link></Button>)}</nav></div><Outlet /></div>;
}
