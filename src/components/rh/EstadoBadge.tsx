import { Badge } from "@/components/ui/badge";
import { ESTADO_LABEL, type EstadoReserva } from "@/lib/negocio";

const VAR: Record<EstadoReserva, "default" | "secondary" | "destructive" | "outline"> = {
  CONFIRMADA: "default", EN_USO: "secondary", FINALIZADA: "outline", CANCELADA: "destructive", NO_PRESENTADA: "destructive",
};
export function EstadoBadge({ estado }: { estado: EstadoReserva }) {
  return <Badge variant={VAR[estado]}>{ESTADO_LABEL[estado]}</Badge>;
}
