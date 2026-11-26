import { createFileRoute } from '@tanstack/react-router';
import { AdminTarifas } from '@/components/rh/AdminTarifas';
import { AdminError, AdminNotFound } from '@/components/rh/AdminFeedback';
import { adminCatalogQuery, adminHead } from '@/lib/admin';
export const Route = createFileRoute('/_authenticated/admin/tarifas')({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminCatalogQuery),
  head: () => adminHead('Tarifas — Administración', 'Precios de billar por hora y minicine por persona en Royalty House.'),
  errorComponent: AdminError,
  notFoundComponent: AdminNotFound,
  component: AdminTarifas,
});
