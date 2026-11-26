import { createFileRoute } from '@tanstack/react-router';
import { AdminReglas } from '@/components/rh/AdminReglas';
import { AdminError, AdminNotFound } from '@/components/rh/AdminFeedback';
import { adminHead } from '@/lib/admin';
import { reglasQuery } from '@/lib/admin-reglas';
export const Route = createFileRoute('/_authenticated/admin/reglas')({
  loader: ({ context }) => context.queryClient.ensureQueryData(reglasQuery),
  head: () => adminHead('Horario y reglas — Administración', 'Horario de atención, plazo de cancelación, tolerancia y límites de reserva de Royalty House.'),
  errorComponent: AdminError,
  notFoundComponent: AdminNotFound,
  component: AdminReglas,
});
