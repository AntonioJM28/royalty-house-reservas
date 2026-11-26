import { createFileRoute } from '@tanstack/react-router';
import { AdminCatalog } from '@/components/rh/AdminEntity';
import { AdminError, AdminNotFound } from '@/components/rh/AdminFeedback';
import { adminCatalogQuery, adminSearch, adminHead } from '@/lib/admin';

export const Route = createFileRoute('/_authenticated/admin/peliculas')({
  validateSearch: adminSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(adminCatalogQuery),
  head: () => adminHead('Películas — Administración', 'Gestión de películas de Royalty House.'),
  errorComponent: AdminError,
  notFoundComponent: AdminNotFound,
  component: Page,
});
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <AdminCatalog kind="peliculas" search={search} onSearch={search => { void navigate({ search, replace: true }); }} />;
}
