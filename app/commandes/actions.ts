"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import type { Prisma, TypeCommande } from "@prisma/client";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { attribuerNumeroBL } from "@/lib/bl";
import {
  calculerCommande,
  ProduitCommandeDuplique,
  ProduitCommandeIntrouvable,
  totalsIdentiques,
} from "@/lib/commandes";
import { calculerResteDu, sommerMontants } from "@/lib/decimal";
import { prisma } from "@/lib/db";
import { requireAdmin, requireCommercial } from "@/lib/session";
import { erreursParChamp } from "@/lib/validations/commun";
import {
  schemaAjoutPaiement,
  schemaCreationCommandeAdmin,
  schemaCreationCommandeCommercial,
  schemaModificationCommandeAdmin,
} from "@/lib/validations/commande";

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Reessayez ou contactez l'administrateur.";

export type ResultatCommande =
  | { ok: true; commandeId: string; numeroBl: string }
  | { ok: false; erreurs?: Record<string, string>; message?: string };

export type ResultatMutationCommande =
  | { ok: true }
  | { ok: false; erreurs?: Record<string, string>; message?: string };

function erreurServeur(erreur: unknown, action: string): ResultatCommande {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[commandes:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

function erreurServeurMutation(
  erreur: unknown,
  action: string,
): ResultatMutationCommande {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[commandes:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

async function verifierResponsableCommandeActif(
  tx: Prisma.TransactionClient,
  responsableId: string,
): Promise<boolean> {
  const responsable = await tx.user.findFirst({
    where: {
      id: responsableId,
      role: { in: ["ADMIN", "COMMERCIAL"] },
      actif: true,
      deleted_at: null,
    },
    select: { id: true },
  });

  return Boolean(responsable);
}

async function verifierClientStandard(
  tx: Prisma.TransactionClient,
  clientId: string,
  commercialId: string,
): Promise<boolean> {
  const client = await tx.client.findFirst({
    where: {
      id: clientId,
      commercial_id: commercialId,
      actif: true,
      deleted_at: null,
    },
    select: { id: true },
  });

  return Boolean(client);
}

async function verifierClientExterne(
  tx: Prisma.TransactionClient,
  clientExterneId: string,
): Promise<boolean> {
  const client = await tx.clientExterne.findFirst({
    where: {
      id: clientExterneId,
      actif: true,
      deleted_at: null,
    },
    select: { id: true },
  });

  return Boolean(client);
}

async function creerCommandeTransactionnelle({
  tx,
  utilisateurAuditId,
  commercialId,
  clientId,
  clientExterneId,
  typeCommande,
  lignes,
  totalAnnonce,
  ip,
}: {
  tx: Prisma.TransactionClient;
  utilisateurAuditId: string;
  commercialId: string;
  clientId?: string;
  clientExterneId?: string;
  typeCommande: TypeCommande;
  lignes: Array<{ produitId: string; quantite: string }>;
  totalAnnonce?: string;
  ip: string | null;
}): Promise<ResultatCommande> {
  if (!(await verifierResponsableCommandeActif(tx, commercialId))) {
    return { ok: false, erreurs: { commercialId: "Responsable introuvable" } };
  }

  if (typeCommande === "STANDARD") {
    if (!clientId || !(await verifierClientStandard(tx, clientId, commercialId))) {
      return { ok: false, erreurs: { clientId: "Client introuvable" } };
    }
  }

  if (typeCommande === "EXTERNE") {
    if (!clientExterneId || !(await verifierClientExterne(tx, clientExterneId))) {
      return {
        ok: false,
        erreurs: { clientExterneId: "Client externe introuvable" },
      };
    }
  }

  const idsProduits = lignes.map((ligne) => ligne.produitId);
  const produits = await tx.produit.findMany({
    where: { id: { in: idsProduits }, actif: true, deleted_at: null },
    select: { id: true, prix_reference: true },
  });

  let commandeCalculee;
  try {
    commandeCalculee = calculerCommande(lignes, produits);
  } catch (erreur) {
    if (erreur instanceof ProduitCommandeIntrouvable) {
      return {
        ok: false,
        message:
          "Un produit est inactif ou introuvable. Rechargez la page avant de continuer.",
      };
    }

    if (erreur instanceof ProduitCommandeDuplique) {
      return {
        ok: false,
        message: "Chaque produit ne peut apparaitre qu'une seule fois par commande.",
      };
    }

    throw erreur;
  }

  if (totalAnnonce && !totalsIdentiques(totalAnnonce, commandeCalculee.total)) {
    return {
      ok: false,
      message:
        "Le total envoye ne correspond pas au total recalcule par le serveur. Rechargez la commande.",
    };
  }

  const bl = await attribuerNumeroBL(tx);
  const commande = await tx.commande.create({
    data: {
      numero_bl: bl.numeroBl,
      numero_bl_compteur: bl.compteur,
      utilisateur_id: commercialId,
      type_commande: typeCommande,
      client_id: typeCommande === "STANDARD" ? clientId : null,
      client_externe_id: typeCommande === "EXTERNE" ? clientExterneId : null,
      lignes: {
        create: commandeCalculee.lignes.map((ligne) => ({
          produit_id: ligne.produitId,
          quantite: ligne.quantite,
          prix_unitaire: ligne.prixUnitaire,
          prix_net: ligne.prixNet,
        })),
      },
    },
    select: { id: true },
  });

  await ecrireAudit(
    tx,
    {
      utilisateurId: utilisateurAuditId,
      action: "commande.creation",
      entite: "commandes",
      entiteId: commande.id,
      apres: {
        numero_bl: bl.numeroBl,
        numero_bl_compteur: bl.compteur,
        utilisateur_id: commercialId,
        client_id: clientId,
        client_externe_id: clientExterneId,
        type_commande: typeCommande,
        total: commandeCalculee.total,
        lignes: commandeCalculee.lignes,
      },
    },
    ip,
  );

  return { ok: true, commandeId: commande.id, numeroBl: bl.numeroBl };
}

export async function creerCommandeCommercial(
  entree: unknown,
): Promise<ResultatCommande> {
  const commercial = await requireCommercial();
  const validation = schemaCreationCommandeCommercial.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { clientId, lignes, totalAnnonce } = validation.data;

  try {
    const ip = await adresseIpRequete();
    const resultat = await prisma.$transaction((tx) =>
      creerCommandeTransactionnelle({
        tx,
        utilisateurAuditId: commercial.id,
        commercialId: commercial.id,
        clientId,
        typeCommande: "STANDARD",
        lignes,
        totalAnnonce,
        ip,
      }),
    );

    if (resultat.ok) {
      revalidatePath("/commercial/commandes");
      revalidatePath("/commercial");
      revalidatePath("/admin/commandes");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation_commercial");
  }
}

export async function creerCommandeAdmin(entree: unknown): Promise<ResultatCommande> {
  const admin = await requireAdmin();
  const validation = schemaCreationCommandeAdmin.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const {
    commercialId,
    typeClient,
    clientId,
    clientExterneId,
    lignes,
    totalAnnonce,
  } = validation.data;
  const typeCommande: TypeCommande = typeClient === "EXTERNE" ? "EXTERNE" : "STANDARD";

  try {
    const ip = await adresseIpRequete();
    const resultat = await prisma.$transaction((tx) =>
      creerCommandeTransactionnelle({
        tx,
        utilisateurAuditId: admin.id,
        commercialId,
        clientId: typeCommande === "STANDARD" ? clientId : undefined,
        clientExterneId: typeCommande === "EXTERNE" ? clientExterneId : undefined,
        typeCommande,
        lignes,
        totalAnnonce,
        ip,
      }),
    );

    if (resultat.ok) {
      revalidatePath("/admin/commandes");
      revalidatePath("/admin");
      revalidatePath("/commercial/commandes");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation_admin");
  }
}

export async function ajouterPaiementCommande(
  entree: unknown,
): Promise<ResultatMutationCommande> {
  const admin = await requireAdmin();
  const validation = schemaAjoutPaiement.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { commandeId, montant, modePaiement, reference } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(
      async (tx): Promise<ResultatMutationCommande> => {
      const verrou = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM commandes
        WHERE id = ${commandeId} AND deleted_at IS NULL
        FOR UPDATE
      `;

      if (!verrou.at(0)) {
        return { ok: false as const, message: "Commande introuvable" };
      }

      const commande = await tx.commande.findUnique({
        where: { id: commandeId },
        select: {
          lignes: {
            where: { deleted_at: null },
            select: { prix_net: true },
          },
          paiements: { select: { montant: true } },
        },
      });

      if (!commande) {
        return { ok: false as const, message: "Commande introuvable" };
      }

      const totalCommande = sommerMontants(
        commande.lignes.map((ligne) => ligne.prix_net),
      );
      const resteDu = calculerResteDu(
        totalCommande,
        commande.paiements.map((paiement) => paiement.montant),
      );

      if (resteDu.lte(0)) {
        return { ok: false as const, message: "Cette commande est deja payee" };
      }

      if (resteDu.lt(montant)) {
        return {
          ok: false as const,
          erreurs: {
            montant: `Le paiement depasse le reste du (${resteDu.toFixed(2)} DH)`,
          },
        };
      }

      const paiement = await tx.paiement.create({
        data: {
          commande_id: commandeId,
          montant,
          mode_paiement: modePaiement,
          reference,
          encaisse_par: admin.id,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "paiement.creation",
          entite: "paiements",
          entiteId: paiement.id,
          apres: {
            commande_id: commandeId,
            montant,
            mode_paiement: modePaiement,
            reference,
          },
        },
        ip,
      );

        return { ok: true };
      },
    );

    if (resultat.ok) {
      revalidatePath(`/admin/commandes/${commandeId}`);
      revalidatePath("/admin/commandes");
      revalidatePath("/commercial/commandes");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeurMutation(erreur, "paiement");
  }
}

export async function modifierCommandeAdmin(
  entree: unknown,
): Promise<ResultatMutationCommande> {
  const admin = await requireAdmin();
  const validation = schemaModificationCommandeAdmin.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const {
    commandeId,
    commercialId,
    typeClient,
    clientId,
    clientExterneId,
    dateCommande,
    lignes,
    totalAnnonce,
  } = validation.data;
  const typeCommande: TypeCommande = typeClient === "EXTERNE" ? "EXTERNE" : "STANDARD";

  try {
    const ip = await adresseIpRequete();
    const resultat = await prisma.$transaction(
      async (tx): Promise<ResultatMutationCommande> => {
      const commande = await tx.commande.findFirst({
        where: { id: commandeId, deleted_at: null },
        select: {
          id: true,
          numero_bl: true,
          utilisateur_id: true,
          client_id: true,
          client_externe_id: true,
          type_commande: true,
          date_commande: true,
          bon_charge: { select: { id: true, numero_bc: true, deleted_at: true } },
          lignes: {
            where: { deleted_at: null },
            select: {
              id: true,
              produit_id: true,
              quantite: true,
              prix_unitaire: true,
              prix_net: true,
            },
          },
          paiements: { select: { montant: true } },
        },
      });

      if (!commande) {
        return { ok: false as const, message: "Commande introuvable" };
      }

      if (commande.bon_charge && !commande.bon_charge.deleted_at) {
        return {
          ok: false as const,
          message:
            `Supprimez d'abord le bon de charge ${commande.bon_charge.numero_bc} avant de modifier ce BL.`,
        };
      }

      if (!(await verifierResponsableCommandeActif(tx, commercialId))) {
        return { ok: false as const, erreurs: { commercialId: "Responsable introuvable" } };
      }

      if (typeCommande === "STANDARD") {
        if (!clientId || !(await verifierClientStandard(tx, clientId, commercialId))) {
          return { ok: false as const, erreurs: { clientId: "Client introuvable" } };
        }
      }

      if (typeCommande === "EXTERNE") {
        if (!clientExterneId || !(await verifierClientExterne(tx, clientExterneId))) {
          return {
            ok: false as const,
            erreurs: { clientExterneId: "Client externe introuvable" },
          };
        }
      }

      const produits = await tx.produit.findMany({
        where: {
          id: { in: lignes.map((ligne) => ligne.produitId) },
          actif: true,
          deleted_at: null,
        },
        select: { id: true, prix_reference: true },
      });

      let commandeCalculee;
      try {
        commandeCalculee = calculerCommande(lignes, produits);
      } catch (erreur) {
        if (erreur instanceof ProduitCommandeIntrouvable) {
          return {
            ok: false as const,
            message:
              "Un produit est inactif ou introuvable. Rechargez la page avant de continuer.",
          };
        }

        if (erreur instanceof ProduitCommandeDuplique) {
          return {
            ok: false as const,
            message: "Chaque produit ne peut apparaitre qu'une seule fois par commande.",
          };
        }

        throw erreur;
      }

      if (totalAnnonce && !totalsIdentiques(totalAnnonce, commandeCalculee.total)) {
        return {
          ok: false as const,
          message:
            "Le total envoye ne correspond pas au total recalcule par le serveur. Rechargez la commande.",
        };
      }

      const dejaPaye = sommerMontants(commande.paiements.map((paiement) => paiement.montant));
      if (dejaPaye.gt(commandeCalculee.total)) {
        return {
          ok: false as const,
          message:
            `Le nouveau total (${commandeCalculee.total} DH) ne peut pas etre inferieur au montant deja paye (${dejaPaye.toFixed(2)} DH).`,
        };
      }

      const dateSelectionnee = DateTime.fromISO(dateCommande, {
        zone: "Africa/Casablanca",
      });

      if (!dateSelectionnee.isValid) {
        return { ok: false as const, erreurs: { dateCommande: "Date invalide" } };
      }

      const dateCommandeStable = DateTime.utc(
        dateSelectionnee.year,
        dateSelectionnee.month,
        dateSelectionnee.day,
        12,
      ).toJSDate();

      const avant = {
        numero_bl: commande.numero_bl,
        utilisateur_id: commande.utilisateur_id,
        client_id: commande.client_id,
        client_externe_id: commande.client_externe_id,
        type_commande: commande.type_commande,
        date_commande: commande.date_commande,
        lignes: commande.lignes.map((ligne) => ({
          produit_id: ligne.produit_id,
          quantite: ligne.quantite.toString(),
          prix_unitaire: ligne.prix_unitaire.toString(),
          prix_net: ligne.prix_net.toString(),
        })),
      };
      const maintenant = new Date();

      await tx.commande.update({
        where: { id: commandeId },
        data: {
          utilisateur_id: commercialId,
          type_commande: typeCommande,
          client_id: typeCommande === "STANDARD" ? clientId : null,
          client_externe_id: typeCommande === "EXTERNE" ? clientExterneId : null,
          date_commande: dateCommandeStable,
        },
      });
      await tx.ligneCommande.updateMany({
        where: { commande_id: commandeId, deleted_at: null },
        data: { deleted_at: maintenant },
      });
      await tx.ligneCommande.createMany({
        data: commandeCalculee.lignes.map((ligne) => ({
          commande_id: commandeId,
          produit_id: ligne.produitId,
          quantite: ligne.quantite,
          prix_unitaire: ligne.prixUnitaire,
          prix_net: ligne.prixNet,
        })),
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "commande.modification",
          entite: "commandes",
          entiteId: commandeId,
          avant,
          apres: {
            numero_bl: commande.numero_bl,
            utilisateur_id: commercialId,
            client_id: typeCommande === "STANDARD" ? clientId : null,
            client_externe_id: typeCommande === "EXTERNE" ? clientExterneId : null,
            type_commande: typeCommande,
            date_commande: dateSelectionnee.toISODate(),
            total: commandeCalculee.total,
            lignes: commandeCalculee.lignes,
          },
        },
        ip,
      );

        return { ok: true };
      },
    );

    if (resultat.ok) {
      revalidatePath(`/admin/commandes/${commandeId}`);
      revalidatePath(`/admin/commandes/${commandeId}/modifier`);
      revalidatePath("/admin/commandes");
      revalidatePath("/commercial/commandes");
      revalidatePath("/admin");
      revalidatePath("/commercial");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeurMutation(erreur, "modification");
  }
}

export async function supprimerCommandeAdmin(
  commandeId: string,
): Promise<ResultatMutationCommande> {
  const admin = await requireAdmin();

  if (!commandeId) {
    return { ok: false, message: "Commande introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const commande = await tx.commande.findFirst({
        where: { id: commandeId, deleted_at: null },
        select: {
          id: true,
          numero_bl: true,
          utilisateur_id: true,
          client_id: true,
          client_externe_id: true,
          type_commande: true,
        },
      });

      if (!commande) {
        return { ok: false as const, message: "Commande introuvable" };
      }

      const maintenant = new Date();
      await tx.commande.update({
        where: { id: commandeId },
        data: { deleted_at: maintenant },
      });
      await tx.ligneCommande.updateMany({
        where: { commande_id: commandeId, deleted_at: null },
        data: { deleted_at: maintenant },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "commande.suppression",
          entite: "commandes",
          entiteId: commandeId,
          avant: commande,
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/commandes");
      revalidatePath("/commercial/commandes");
      revalidatePath(`/admin/commandes/${commandeId}`);
    }

    return resultat;
  } catch (erreur) {
    return erreurServeurMutation(erreur, "suppression");
  }
}
