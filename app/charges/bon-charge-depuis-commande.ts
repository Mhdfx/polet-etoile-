import type { Prisma } from "@prisma/client";
import { ecrireAudit } from "@/lib/audit";
import { attribuerNumeroBC } from "@/lib/bc";
import { calculerLignesCharge } from "@/lib/charge";

export type ResultatCreationBonChargeCommande =
  | { statut: "cree"; bonChargeId: string; numeroBc: string }
  | { statut: "regenere"; bonChargeId: string; numeroBc: string }
  | { statut: "existant"; bonChargeId: string; numeroBc: string }
  | {
      statut: "introuvable" | "supprime" | "sans_produit_physique";
      message: string;
    };

/**
 * Cree, sous verrou, le bon de charge rattache a une commande.
 *
 * La fonction est partagee par l'action admin et la generation a la demande
 * commerciale. `commercialIdAttendu` est une seconde barriere serveur : une
 * commande d'un autre portefeuille est traitee comme introuvable.
 */
export async function assurerBonChargeDepuisCommande(
  tx: Prisma.TransactionClient,
  {
    commandeId,
    acteurId,
    commercialIdAttendu,
    autoriserRegeneration = false,
    ip,
    actionAudit = "bon_charge.creation_depuis_commande",
    actionAuditRegeneration = "bon_charge.regeneration_depuis_commande",
  }: {
    commandeId: string;
    acteurId: string;
    commercialIdAttendu?: string;
    autoriserRegeneration?: boolean;
    ip: string | null;
    actionAudit?: string;
    actionAuditRegeneration?: string;
  },
): Promise<ResultatCreationBonChargeCommande> {
  if (commercialIdAttendu) {
    await tx.$queryRaw`
      SELECT id FROM commandes
      WHERE id = ${commandeId}
        AND utilisateur_id = ${commercialIdAttendu}
        AND deleted_at IS NULL
      FOR UPDATE
    `;
  } else {
    await tx.$queryRaw`
      SELECT id FROM commandes
      WHERE id = ${commandeId} AND deleted_at IS NULL
      FOR UPDATE
    `;
  }

  const commande = await tx.commande.findFirst({
    where: {
      id: commandeId,
      deleted_at: null,
      ...(commercialIdAttendu ? { utilisateur_id: commercialIdAttendu } : {}),
    },
    select: {
      id: true,
      numero_bl: true,
      utilisateur_id: true,
      date_commande: true,
      bon_charge: {
        select: { id: true, numero_bc: true, deleted_at: true },
      },
      lignes: {
        where: { deleted_at: null },
        select: {
          produit_id: true,
          quantite: true,
          produit: { select: { id: true, suivi_stock: true } },
        },
      },
    },
  });

  if (!commande) {
    return { statut: "introuvable", message: "Commande introuvable" };
  }

  if (commande.bon_charge && !commande.bon_charge.deleted_at) {
    return {
      statut: "existant",
      bonChargeId: commande.bon_charge.id,
      numeroBc: commande.bon_charge.numero_bc,
    };
  }

  if (commande.bon_charge?.deleted_at && !autoriserRegeneration) {
    return {
      statut: "supprime",
      message: `Le bon de charge ${commande.bon_charge.numero_bc} a deja ete genere puis supprime pour cette commande. Demandez sa regeneration a l'administrateur.`,
    };
  }

  const lignesStock = commande.lignes
    .filter((ligne) => ligne.produit.suivi_stock)
    .map((ligne) => ({
      produitId: ligne.produit_id,
      quantite: ligne.quantite.toFixed(3),
    }));

  if (lignesStock.length === 0) {
    return {
      statut: "sans_produit_physique",
      message: "Cette commande ne contient aucun produit physique a charger.",
    };
  }

  const produitsAutorises = commande.lignes
    .filter((ligne) => ligne.produit.suivi_stock)
    .map((ligne) => ({ id: ligne.produit_id }));
  const lignesCalculees = calculerLignesCharge(lignesStock, produitsAutorises);
  const bc = await attribuerNumeroBC(tx);

  if (commande.bon_charge?.deleted_at) {
    const maintenant = new Date();
    await tx.ligneBonCharge.updateMany({
      where: {
        bon_charge_id: commande.bon_charge.id,
        deleted_at: null,
      },
      data: { deleted_at: maintenant },
    });

    const bonCharge = await tx.bonCharge.update({
      where: { id: commande.bon_charge.id },
      data: {
        numero_bc: bc.numeroBc,
        numero_bc_compteur: bc.compteur,
        commercial_id: commande.utilisateur_id,
        cree_par: acteurId,
        date_charge: commande.date_commande,
        commentaire: `Regenere depuis la commande ${commande.numero_bl}`,
        deleted_at: null,
        lignes: {
          create: lignesCalculees.map((ligne) => ({
            produit_id: ligne.produitId,
            quantite_kg: ligne.quantite,
          })),
        },
      },
      select: { id: true },
    });

    await ecrireAudit(
      tx,
      {
        utilisateurId: acteurId,
        action: actionAuditRegeneration,
        entite: "bons_charge",
        entiteId: bonCharge.id,
        avant: {
          numero_bc: commande.bon_charge.numero_bc,
          deleted_at: commande.bon_charge.deleted_at.toISOString(),
        },
        apres: {
          numero_bc: bc.numeroBc,
          numero_bc_compteur: bc.compteur,
          commande_id: commande.id,
          numero_bl: commande.numero_bl,
          commercial_id: commande.utilisateur_id,
          lignes: lignesCalculees,
          regenere: true,
        },
      },
      ip,
    );

    return {
      statut: "regenere",
      bonChargeId: bonCharge.id,
      numeroBc: bc.numeroBc,
    };
  }

  const bonCharge = await tx.bonCharge.create({
    data: {
      numero_bc: bc.numeroBc,
      numero_bc_compteur: bc.compteur,
      commande_id: commande.id,
      commercial_id: commande.utilisateur_id,
      cree_par: acteurId,
      date_charge: commande.date_commande,
      commentaire: `Genere depuis la commande ${commande.numero_bl}`,
      lignes: {
        create: lignesCalculees.map((ligne) => ({
          produit_id: ligne.produitId,
          quantite_kg: ligne.quantite,
        })),
      },
    },
    select: { id: true },
  });

  await ecrireAudit(
    tx,
    {
      utilisateurId: acteurId,
      action: actionAudit,
      entite: "bons_charge",
      entiteId: bonCharge.id,
      apres: {
        numero_bc: bc.numeroBc,
        numero_bc_compteur: bc.compteur,
        commande_id: commande.id,
        numero_bl: commande.numero_bl,
        commercial_id: commande.utilisateur_id,
        lignes: lignesCalculees,
      },
    },
    ip,
  );

  return {
    statut: "cree",
    bonChargeId: bonCharge.id,
    numeroBc: bc.numeroBc,
  };
}
