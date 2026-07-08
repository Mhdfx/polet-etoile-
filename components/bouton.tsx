"use client";

import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type BoutonProps = ComponentProps<typeof Button> & {
  /** Desactive le bouton et affiche un spinner (anti double-soumission cote UI). */
  chargement?: boolean;
};

export function Bouton({
  chargement = false,
  disabled,
  children,
  ...props
}: BoutonProps) {
  return (
    <Button disabled={disabled || chargement} aria-busy={chargement} {...props}>
      {chargement ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
