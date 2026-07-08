import { cn } from "@/lib/utils";

type Tonalite = "bleu" | "rouge" | "vert" | "neutre";

const tonalites: Record<Tonalite, string> = {
  bleu: "bg-primary text-primary-foreground",
  rouge: "bg-alerte text-alerte-foreground",
  vert: "bg-succes text-succes-foreground",
  neutre: "bg-card text-card-foreground ring-1 ring-border",
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
  className?: string;
};

export function CarteKPI({
  label,
  valeur,
  tonalite = "bleu",
  detail,
  className,
}: CarteKPIProps) {
  return (
    <article className={cn("rounded-lg p-4 shadow-sm", tonalites[tonalite], className)}>
      <p
        className={cn(
          "text-xs font-medium",
          tonalite === "neutre" ? "text-muted-foreground" : "opacity-75",
        )}
      >
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-normal tabular-nums">
        {valeur}
      </p>
      {detail ? (
        <p
          className={cn(
            "mt-1 text-xs",
            tonalite === "neutre" ? "text-muted-foreground" : "opacity-70",
          )}
        >
          {detail}
        </p>
      ) : null}
    </article>
  );
}
