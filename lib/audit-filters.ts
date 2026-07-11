import type { Prisma, RoleUtilisateur } from "@prisma/client";

type BornesAudit = {
  debutUtc: Date;
  finExclusiveUtc: Date;
};

export type FiltresAudit = {
  utilisateurId?: string;
  action?: string;
  entite?: string;
  bornes?: BornesAudit;
  roleAuteur?: RoleUtilisateur;
  periodeInvalide?: boolean;
};

/** Construit le filtre commun aux vues et exports du journal d'audit. */
export function construireFiltreAudit({
  utilisateurId,
  action,
  entite,
  bornes,
  roleAuteur,
  periodeInvalide = false,
}: FiltresAudit): Prisma.AuditLogWhereInput {
  return {
    ...(periodeInvalide ? { id: { in: [] } } : {}),
    ...(utilisateurId ? { utilisateur_id: utilisateurId } : {}),
    ...(action ? { action: { contains: action } } : {}),
    ...(entite ? { entite: { contains: entite } } : {}),
    ...(bornes
      ? { created_at: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } }
      : {}),
    ...(roleAuteur ? { utilisateur: { is: { role: roleAuteur } } } : {}),
  };
}
