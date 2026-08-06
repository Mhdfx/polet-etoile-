import type { Prisma } from "@prisma/client";

/** Ordre stable : date metier, creation, puis numero les plus recents. */
export const ORDRE_COMMANDES_PLUS_RECENTES = [
  { date_commande: "desc" },
  { created_at: "desc" },
  { numero_bl: "desc" },
] satisfies Prisma.CommandeOrderByWithRelationInput[];
