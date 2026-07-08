import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";

type EntreeAudit = {
  utilisateurId: string;
  action: string;
  entite: string;
  entiteId?: string;
  avant?: Prisma.InputJsonValue;
  apres?: Prisma.InputJsonValue;
};

export async function adresseIpRequete(): Promise<string | null> {
  const entetes = await headers();
  const transmis = entetes.get("x-forwarded-for");

  return transmis?.split(",")[0]?.trim() || null;
}

/**
 * Ecrit une entree d'audit dans la MEME transaction que l'operation tracee :
 * si l'operation echoue, l'audit est annule avec elle (tout ou rien).
 */
export async function ecrireAudit(
  tx: Prisma.TransactionClient,
  { utilisateurId, action, entite, entiteId, avant, apres }: EntreeAudit,
  ipAddress: string | null = null,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      utilisateur_id: utilisateurId,
      action,
      entite,
      entite_id: entiteId,
      donnees_avant: avant,
      donnees_apres: apres,
      ip_address: ipAddress,
    },
  });
}
