import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Statut = "paye" | "en_attente" | "actif" | "inactif" | "supprime";

const statuts: Record<Statut, { label: string; className: string }> = {
  paye: { label: "Payé", className: "bg-succes/10 text-succes" },
  en_attente: { label: "En attente", className: "bg-alerte/10 text-alerte" },
  actif: { label: "Actif", className: "bg-succes/10 text-succes" },
  inactif: { label: "Inactif", className: "bg-muted text-muted-foreground" },
  supprime: { label: "Supprimé", className: "bg-destructive/10 text-destructive" },
};

export function BadgeStatut({
  statut,
  className,
}: {
  statut: Statut;
  className?: string;
}) {
  const config = statuts[statut];

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
