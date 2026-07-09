"use server";

import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function journaliserDeconnexion() {
  try {
    const utilisateur = await requireSession();
    const ip = await adresseIpRequete();

    await prisma.$transaction((tx) =>
      ecrireAudit(
        tx,
        {
          utilisateurId: utilisateur.id,
          action: "auth.deconnexion",
          entite: "sessions",
          entiteId: utilisateur.id,
        },
        ip,
      ),
    );
  } catch (erreur) {
    console.error("[auth:deconnexion] audit impossible", erreur);
  }
}
