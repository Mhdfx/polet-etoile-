"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChampMontantProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "inputMode"
>;

/**
 * Saisie d'un montant en DH. La valeur reste une chaine (virgule ou point
 * acceptes) : normalisation via `normaliserSaisieMontant` avant tout calcul.
 * Ne jamais convertir en `number`.
 */
export function ChampMontant({ className, ...props }: ChampMontantProps) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        className={cn("pr-11 text-right tabular-nums", className)}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        DH
      </span>
    </div>
  );
}
