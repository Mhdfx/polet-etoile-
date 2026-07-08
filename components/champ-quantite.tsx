"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChampQuantiteProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "inputMode"
>;

/**
 * Saisie d'une quantite en kg (3 decimales max). La valeur reste une chaine :
 * normalisation via `normaliserSaisieQuantite` avant tout calcul.
 */
export function ChampQuantite({ className, ...props }: ChampQuantiteProps) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,000"
        className={cn("pr-10 text-right tabular-nums", className)}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        kg
      </span>
    </div>
  );
}
