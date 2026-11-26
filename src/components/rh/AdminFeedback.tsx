import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return <div role="alert" className="space-y-4 py-8"><AlertCircle className="text-destructive" /><h1 className="font-display text-3xl">No se pudo cargar la administración</h1><p className="text-muted-foreground">Comprueba tu conexión y vuelve a intentar.</p><Button onClick={() => router.invalidate()}><RotateCw /> Reintentar</Button><span className="sr-only">{error instanceof Error ? error.message : 'Error de conexión'}</span></div>;
}
export function AdminNotFound() { return <p className="py-8 text-muted-foreground">No se encontró este registro.</p>; }
