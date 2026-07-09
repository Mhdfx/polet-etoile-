import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type Tonalite = "bleu" | "rouge" | "vert" | "neutre";

/**
 * bleu / vert / neutre : carte blanche avec pastille d'accent (lecture dense).
 * rouge : carte pleine — reservee aux alertes (ex. chiffre non regle, CDC §5.2).
 */
const pastilles: Record<Tonalite, string> = {
  bleu: "bg-primary/10 text-primary",
  vert: "bg-succes/10 text-succes",
  rouge: "bg-white/20 text-white",
  neutre: "bg-muted text-muted-foreground",
};

type CarteKPIProps = {
  label: string;
  /**
   * Valeur deja formatee (ex. via `formatMontant`). Periode vide :
   * passer "0,00 DH" ou "—", jamais une valeur brute NaN/null.
   */
  valeur: string;
  tonalite?: Tonalite;
  detail?: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
};

export function CarteKPI({
  label,
  valeur,
  tonalite = "bleu",
  detail,
  icon: Icon,
  className,
}: CarteKPIProps) {
  const alerte = tonalite === "rouge";

  return (
    <article
      className={cn(
        "rounded-lg p-4 shadow-sm transition-shadow hover:shadow-md",
        alerte
          ? "bg-alerte text-alerte-foreground"
          : "bg-card text-card-foreground ring-1 ring-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            alerte ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-md",
              pastilles[tonalite],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums lg:text-3xl">
        {valeur}
      </p>
      {detail ? (
        <p
          className={cn(
            "mt-1 text-xs",
            alerte ? "text-white/75" : "text-muted-foreground",
          )}
        >
          {detail}
        </p>
      ) : null}
    </article>
  );
}
