import { createFileRoute } from '@tanstack/react-router';
import { AdminReportes } from '@/components/rh/AdminReportes';
import { AdminError, AdminNotFound } from '@/components/rh/AdminFeedback';
import { adminHead } from '@/lib/admin';
export const Route = createFileRoute('/_authenticated/admin/reportes')({
  head: () => adminHead('Reportes — Administración', 'Ocupación e ingresos estimados por día y por tipo de recurso en Royalty House.'),
  errorComponent: AdminError,
  notFoundComponent: AdminNotFound,
  component: AdminReportes,
});
