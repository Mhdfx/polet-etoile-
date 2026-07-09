"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { ResultatAction } from "@/lib/validations/commun";

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Reessayez ou contactez l'administrateur.";

function erreurServeur(erreur: unknown): ResultatAction {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[sessions:suppression] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

export async function supprimerSession(sessionId: string): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!sessionId) {
    return { ok: false, message: "Session introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          userId: true,
          ipAddress: true,
          user: { select: { nom_utilisateur: true } },
        },
      });

      if (!session) {
        return { ok: false as const, message: "Session introuvable" };
      }

      await tx.session.delete({ where: { id: sessionId } });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "session.suppression",
          entite: "sessions",
          entiteId: sessionId,
          avant: {
            userId: session.userId,
            ipAddress: session.ipAddress,
            nom_utilisateur: session.user.nom_utilisateur,
          },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/sessions");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur);
  }
}
