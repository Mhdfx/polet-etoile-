"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireCommercial } from "@/lib/session";
import { erreursParChamp, type ResultatAction } from "@/lib/validations/commun";
import { schemaCreationRetour } from "@/lib/validations/retour";

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Reessayez ou contactez l'administrateur.";

function erreurServeur(erreur: unknown, action: string): ResultatAction {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[retours:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

export async function creerRetour(entree: unknown): Promise<ResultatAction> {
  const commercial = await requireCommercial();
  const validation = schemaCreationRetour.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { produitId, quantiteKg, commentaire } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const produit = await tx.produit.findFirst({
        where: { id: produitId, actif: true, deleted_at: null },
        select: { nom: true },
      });

      if (!produit) {
        return { ok: false as const, erreurs: { produitId: "Produit introuvable" } };
      }

      const retour = await tx.retour.create({
        data: {
          produit_id: produitId,
          quantite_kg: quantiteKg,
          commentaire,
          utilisateur_id: commercial.id,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: commercial.id,
          action: "retour.creation",
          entite: "retours",
          entiteId: retour.id,
          apres: { produit_id: produitId, quantite_kg: quantiteKg, commentaire },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/commercial/retours");
      revalidatePath("/admin/retours");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation");
  }
}
