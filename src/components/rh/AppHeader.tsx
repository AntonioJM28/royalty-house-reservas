import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Crown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { esAdmin, esPersonal, type Sesion } from "@/lib/sesion";

export function AppHeader({ sesion }: { sesion: Sesion }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const links: { to: string; label: string }[] = [];
  if (esAdmin(sesion.roles)) {
    links.push({ to: "/admin", label: "Administración" }, { to: "/admin/personal", label: "Personal" }, { to: "/admin/reportes", label: "Reportes" });
  }
  if (esPersonal(sesion.roles)) {
    links.push({ to: "/recepcion", label: "Panel del día" }, { to: "/recepcion/mostrador", label: "Mostrador" });
  } else {
    links.push({ to: "/cliente", label: "Mis reservas" }, { to: "/cliente/nueva", label: "Nueva reserva" });
  }
  async function salir() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold text-primary">
          <Crown className="h-5 w-5" /> Royalty House
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground md:inline">{sesion.perfil?.nombre}</span>
          <Button variant="ghost" size="sm" onClick={salir}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
