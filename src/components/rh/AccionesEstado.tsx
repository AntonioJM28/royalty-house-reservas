import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { mensajeError, puedeMarcarNoPresentada, type EstadoReserva } from "@/lib/negocio";
import type { ReservaFull } from "@/lib/reserva";

export function AccionesEstado({ r, tolerancia }: { r: ReservaFull; tolerancia: number }) {
  const qc = useQueryClient();
  async function cambiar(estado: EstadoReserva, ok: string) {
    const { error } = await supabase.rpc("cambiar_estado_reserva", { p_id: r.id, p_estado: estado });
    if (error) return toast.error(mensajeError(error));
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["reservas"] });
    qc.invalidateQueries({ queryKey: ["ocupacion"] });
  }
  async function cancelar() {
    const { error } = await supabase.rpc("cancelar_reserva", { p_id: r.id });
    if (error) return toast.error(mensajeError(error));
    toast.success("Reserva cancelada.");
    qc.invalidateQueries({ queryKey: ["reservas"] });
  }
  const noShow = puedeMarcarNoPresentada(r.fecha, r.hora_inicio, tolerancia);
  return (
    <div className="flex flex-wrap gap-2">
      {r.estado === "CONFIRMADA" && (
        <>
          <Button size="sm" onClick={() => cambiar("EN_USO", "Entrada registrada.")}>Registrar entrada</Button>
          <Button size="sm" variant="outline" disabled={!noShow} title={noShow ? "" : `Disponible tras ${tolerancia} min del inicio`}
            onClick={() => cambiar("NO_PRESENTADA", "Marcada como no presentada.")}>Marcar no presentada</Button>
          <Button size="sm" variant="ghost" onClick={cancelar}>Cancelar</Button>
        </>
      )}
      {r.estado === "EN_USO" && (
        <Button size="sm" variant="secondary" onClick={() => cambiar("FINALIZADA", "Salida registrada.")}>Registrar salida</Button>
      )}
    </div>
  );
}
