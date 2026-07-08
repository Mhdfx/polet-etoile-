"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Periode = {
  /** Date locale (Africa/Casablanca) au format AAAA-MM-JJ, bornes incluses. */
  du?: string;
  au?: string;
};

type FiltrePeriodeProps = {
  periode: Periode;
  onPeriodeChange: (periode: Periode) => void;
  disabled?: boolean;
};

/**
 * Filtre de periode inclusif : le serveur doit interpreter `au` comme
 * `< (au + 1 jour) 00:00` en heure de Casablanca (regle CLAUDE.md §2.14).
 */
export function FiltrePeriode({
  periode,
  onPeriodeChange,
  disabled = false,
}: FiltrePeriodeProps) {
  return (
    <fieldset className="flex flex-wrap items-end gap-3" disabled={disabled}>
      <div className="grid gap-1.5">
        <Label htmlFor="periode-du">Du</Label>
        <Input
          id="periode-du"
          type="date"
          value={periode.du ?? ""}
          max={periode.au}
          onChange={(evenement) =>
            onPeriodeChange({ ...periode, du: evenement.target.value || undefined })
          }
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="periode-au">Au</Label>
        <Input
          id="periode-au"
          type="date"
          value={periode.au ?? ""}
          min={periode.du}
          onChange={(evenement) =>
            onPeriodeChange({ ...periode, au: evenement.target.value || undefined })
          }
        />
      </div>
    </fieldset>
  );
}
