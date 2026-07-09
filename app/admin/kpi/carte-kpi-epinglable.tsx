"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin } from "lucide-react";
import { CarteKPI } from "@/components/carte-kpi";
import { cn } from "@/lib/utils";
import { basculerEpingleKpi } from "./actions";

/**
 * Carte KPI de l'ecran Audit KPIs avec icone « epingler » (CDC 6.5.3) :
 * la carte epinglee apparait sur le tableau de bord principal /admin.
 */
export function CarteKpiEpinglable({
  cle,
  epingle,
  label,
  valeur,
  tonalite,
}: {
  cle: string;
  epingle: boolean;
  label: string;
  valeur: string;
  tonalite: "bleu" | "rouge" | "vert" | "neutre";
}) {
  const router = useRouter();
  const [enCours, startTransition] = useTransition();

  return (
    <div className="relative">
      <CarteKPI label={label} valeur={valeur} tonalite={tonalite} />
      <button
        type="button"
        aria-pressed={epingle}
        title={epingle ? "Retirer du tableau de bord" : "Épingler au tableau de bord"}
        disabled={enCours}
        onClick={() =>
          startTransition(async () => {
            await basculerEpingleKpi(cle);
            router.refresh();
          })
        }
        className={cn(
          "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md transition",
          tonalite === "rouge"
            ? "text-white/70 hover:bg-white/15 hover:text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          epingle && (tonalite === "rouge" ? "text-white" : "text-primary"),
          enCours && "opacity-50",
        )}
      >
        <Pin
          aria-hidden="true"
          className={cn("h-3.5 w-3.5", epingle && "fill-current")}
        />
        <span className="sr-only">
          {epingle ? "Retirer du tableau de bord" : "Épingler au tableau de bord"}
        </span>
      </button>
    </div>
  );
}
