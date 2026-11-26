import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clapperboard, Crown, Popcorn, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cargarSesion, destinoInicial } from "@/lib/sesion";
import { GoogleButton } from "@/components/rh/GoogleButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Royalty House — Reserva billar y minicine" },
      { name: "description", content: "Reserva mesas de billar normales y VIP o salas privadas de minicine con candy bar en Royalty House." },
      { property: "og:title", content: "Royalty House — Reserva billar y minicine" },
      { property: "og:description", content: "Mesas de billar, salas privadas de minicine y candy bar. Reserva en línea y paga en el local." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    let vivo = true;
    let comprobando = false;
    let pendiente = false;
    let navegando = false;

    const ir = async () => {
      if (!vivo || navegando) return;
      if (comprobando) {
        pendiente = true;
        return;
      }

      comprobando = true;
      try {
        const s = await cargarSesion();
        if (s && vivo) {
          navegando = true;
          await navigate({ to: destinoInicial(s), replace: true });
        }
      } catch (error) {
        console.error("No se pudo completar la redirección después del inicio de sesión:", error);
        toast.error("No se pudo cargar tu sesión.", {
          description: error instanceof Error ? error.message : "Intenta iniciar sesión nuevamente.",
        });
      } finally {
        comprobando = false;
        if (pendiente && vivo && !navegando) {
          pendiente = false;
          void ir();
        }
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
        window.setTimeout(() => void ir(), 0);
      }
    });
    void ir();

    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="bg-felt min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col px-5 py-8">
        <div className="flex items-center gap-2 font-display text-2xl font-semibold text-primary">
          <Crown className="h-6 w-6" /> Royalty House
        </div>
        <section className="py-16 sm:py-24">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Billar · Minicine · Candy bar</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-foreground sm:text-7xl">
            Tu mesa, tu sala, <span className="text-primary">tu noche.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Consulta la disponibilidad en tiempo real y reserva en segundos. Recibe tu código y paga en efectivo al llegar.
          </p>
          <div className="mt-10">
            <GoogleButton />
          </div>
        </section>
        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {[
            { i: Target, t: "Billar normal y VIP", d: "Mesas desde Bs 30 la hora, de 1 a 4 horas." },
            { i: Clapperboard, t: "Salas de minicine", d: "Salas privadas de hasta 7 personas, Bs 10 por persona, con la película que elijas." },
            { i: Popcorn, t: "Candy bar", d: "Deja tu pedido listo para tu función de minicine." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-card/70 p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-display text-2xl font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
