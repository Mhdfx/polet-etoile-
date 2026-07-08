import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ChampProps = {
  id: string;
  label: string;
  /** Message d'erreur en francais clair, affiche au plus pres du champ. */
  erreur?: string;
  description?: string;
  obligatoire?: boolean;
  children: ReactNode;
  className?: string;
};

export function Champ({
  id,
  label,
  erreur,
  description,
  obligatoire = false,
  children,
  className,
}: ChampProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {obligatoire ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {description && !erreur ? (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {erreur ? (
        <p id={`${id}-erreur`} role="alert" className="text-xs font-medium text-destructive">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
