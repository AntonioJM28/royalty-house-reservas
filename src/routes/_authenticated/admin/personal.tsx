import { createFileRoute } from '@tanstack/react-router';
import { AdminPersonal } from '@/components/rh/AdminEntity';
import { AdminError, AdminNotFound } from '@/components/rh/AdminFeedback';
import { adminPersonalQuery, adminSearch, adminHead } from '@/lib/admin';
export const Route = createFileRoute('/_authenticated/admin/personal')({
  validateSearch: adminSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(adminPersonalQuery),
  head: () => adminHead('Personal — Administración', 'Gestión de los correos autorizados de recepción y administración de Royalty House.'),
  errorComponent: AdminError,
  notFoundComponent: AdminNotFound,
  component: Page,
});
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { sesion } = Route.useRouteContext();
  return <AdminPersonal search={search} ownEmail={sesion.perfil?.correo ?? ''} onSearch={search => { void navigate({ search, replace: true }); }} />;
}
