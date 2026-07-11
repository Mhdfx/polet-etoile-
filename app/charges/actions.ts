"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { attribuerNumeroBC } from "@/lib/bc";
import {
  calculerLignesCharge,
  ProduitChargeDuplique,
  ProduitChargeIntrouvable,
} from "@/lib/charge";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { erreursParChamp, type ResultatAction } from "@/lib/validations/commun";
import { schemaCreationBonCharge } from "@/lib/validations/charge";

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Reessayez ou contactez l'administrateur.";

export type ResultatBonCharge =
  | { ok: true; bonChargeId: string; numeroBc: string }
  | { ok: false; erreurs?: Record<string, string>; message?: string };

function erreurServeur(erreur: unknown, action: string): ResultatBonCharge {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[charges:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

function erreurServeurMutation(erreur: unknown, action: string): ResultatAction {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[charges:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

async function verifierCommercialActif(
  tx: Prisma.TransactionClient,
  commercialId: string,
): Promise<boolean> {
  const commercial = await tx.user.findFirst({
    where: { id: commercialId, role: "COMMERCIAL", actif: true, deleted_at: null },
    select: { id: true },
  });

  return Boolean(commercial);
}

export async function creerBonCharge(entree: unknown): Promise<ResultatBonCharge> {
  const admin = await requireAdmin();
  const validation = schemaCreationBonCharge.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { commercialId, dateCharge, commentaire, lignes } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      if (!(await verifierCommercialActif(tx, commercialId))) {
        return { ok: false as const, erreurs: { commercialId: "Commercial introuvable" } };
      }

      // Seuls les produits physiques actifs (suivi_stock) peuvent etre charges :
      // les pseudo-produits (RELIQUAT PAYEMENT) sont exclus a la source.
      const idsProduits = lignes.map((ligne) => ligne.produitId);
      const produits = await tx.produit.findMany({
        where: {
          id: { in: idsProduits },
          actif: true,
          deleted_at: null,
          suivi_stock: true,
        },
        select: { id: true },
      });

      let lignesCalculees;
      try {
        lignesCalculees = calculerLignesCharge(lignes, produits);
      } catch (erreur) {
        if (erreur instanceof ProduitChargeIntrouvable) {
          return {
            ok: false as const,
            message:
              "Un produit est inactif, introuvable ou non suivi en stock. Rechargez la page.",
          };
        }
        if (erreur instanceof ProduitChargeDuplique) {
          return {
            ok: false as const,
            message: "Chaque produit ne peut apparaitre qu'une seule fois par bon de charge.",
          };
        }
        throw erreur;
      }

      const bc = await attribuerNumeroBC(tx);
      const bonCharge = await tx.bonCharge.create({
        data: {
          numero_bc: bc.numeroBc,
          numero_bc_compteur: bc.compteur,
          commande_id: null,
          commercial_id: commercialId,
          cree_par: admin.id,
          ...(dateCharge ? { date_charge: dateCharge } : {}),
          commentaire,
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
          utilisateurId: admin.id,
          action: "bon_charge.creation",
          entite: "bons_charge",
          entiteId: bonCharge.id,
          apres: {
            numero_bc: bc.numeroBc,
            numero_bc_compteur: bc.compteur,
            commercial_id: commercialId,
            date_charge: dateCharge?.toISOString(),
            commentaire,
            lignes: lignesCalculees,
          },
        },
        ip,
      );

      return { ok: true as const, bonChargeId: bonCharge.id, numeroBc: bc.numeroBc };
    });

    if (resultat.ok) {
      revalidatePath("/admin/charges");
      revalidatePath("/admin/rapprochement");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation");
  }
}

export async function creerBonChargeDepuisCommande(commandeId: string): Promise<ResultatBonCharge> {
  const admin = await requireAdmin();

  if (!commandeId) {
    return { ok: false, message: "Commande introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM commandes
        WHERE id = ${commandeId} AND deleted_at IS NULL
        FOR UPDATE
      `;

      const commande = await tx.commande.findFirst({
        where: { id: commandeId, deleted_at: null },
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
        return { ok: false as const, message: "Commande introuvable" };
      }

      if (commande.bon_charge) {
        return {
          ok: false as const,
          message: commande.bon_charge.deleted_at
            ? `Le bon de charge ${commande.bon_charge.numero_bc} a deja ete genere puis supprime pour cette commande.`
            : `Le bon de charge ${commande.bon_charge.numero_bc} existe deja pour cette commande.`,
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
          ok: false as const,
          message: "Cette commande ne contient aucun produit physique a charger.",
        };
      }

      const produitsAutorises = commande.lignes
        .filter((ligne) => ligne.produit.suivi_stock)
        .map((ligne) => ({ id: ligne.produit_id }));
      const lignesCalculees = calculerLignesCharge(lignesStock, produitsAutorises);
      const bc = await attribuerNumeroBC(tx);

      const bonCharge = await tx.bonCharge.create({
        data: {
          numero_bc: bc.numeroBc,
          numero_bc_compteur: bc.compteur,
          commande_id: commande.id,
          commercial_id: commande.utilisateur_id,
          cree_par: admin.id,
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
          utilisateurId: admin.id,
          action: "bon_charge.creation_depuis_commande",
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

      return { ok: true as const, bonChargeId: bonCharge.id, numeroBc: bc.numeroBc };
    });

    if (resultat.ok) {
      revalidatePath("/admin/charges");
      revalidatePath(`/admin/charges/${resultat.bonChargeId}`);
      revalidatePath("/admin/commandes");
      revalidatePath(`/admin/commandes/${commandeId}`);
      revalidatePath("/admin/rapprochement");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation_depuis_commande");
  }
}

export async function supprimerBonCharge(bonChargeId: string): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!bonChargeId) {
    return { ok: false, message: "Bon de charge introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const bonCharge = await tx.bonCharge.findFirst({
        where: { id: bonChargeId, deleted_at: null },
        select: {
          id: true,
          numero_bc: true,
          commande_id: true,
          commercial_id: true,
          date_charge: true,
        },
      });

      if (!bonCharge) {
        return { ok: false as const, message: "Bon de charge introuvable" };
      }

      const maintenant = new Date();
      await tx.bonCharge.update({
        where: { id: bonChargeId },
        data: { deleted_at: maintenant },
      });
      await tx.ligneBonCharge.updateMany({
        where: { bon_charge_id: bonChargeId, deleted_at: null },
        data: { deleted_at: maintenant },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "bon_charge.suppression",
          entite: "bons_charge",
          entiteId: bonChargeId,
          avant: {
            numero_bc: bonCharge.numero_bc,
            commande_id: bonCharge.commande_id,
            commercial_id: bonCharge.commercial_id,
            date_charge: bonCharge.date_charge.toISOString(),
          },
        },
        ip,
      );

      return { ok: true as const, commandeId: bonCharge.commande_id };
    });

    if (resultat.ok) {
      revalidatePath("/admin/charges");
      revalidatePath("/admin/rapprochement");
      revalidatePath(`/admin/charges/${bonChargeId}`);
      if (resultat.commandeId) {
        revalidatePath("/admin/commandes");
        revalidatePath(`/admin/commandes/${resultat.commandeId}`);
      }
    }

    return resultat;
  } catch (erreur) {
    return erreurServeurMutation(erreur, "suppression");
  }
}
