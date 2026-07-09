"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { z } from "zod";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { normaliserSaisieMontant } from "@/lib/saisie";
import {
  erreursParChamp,
  schemaChangementPrix,
  schemaCreationProduit,
  schemaModificationProduit,
  schemaPrixEnMasse,
  type ResultatAction,
} from "@/lib/validations/produit";

const schemaRenommerCategorie = z.object({
  ancienneCategorie: z.string().trim().min(1, "Categorie source obligatoire"),
  nouvelleCategorie: z
    .string()
    .trim()
    .min(1, "Nouvelle categorie obligatoire")
    .max(120, "La categorie ne doit pas depasser 120 caracteres"),
});

const schemaPrixPourcentageCategorie = z.object({
  categorie: z.string().trim().min(1, "Categorie obligatoire"),
  pourcentage: z.string().transform((valeur, contexte) => {
    const normalise = normaliserSaisieMontant(valeur);
    if (normalise === null) {
      contexte.addIssue({ code: "custom", message: "Pourcentage invalide" });
      return z.NEVER;
    }
    const decimal = new Decimal(normalise);
    if (decimal.lt(-90) || decimal.gt(200)) {
      contexte.addIssue({
        code: "custom",
        message: "Le pourcentage doit etre compris entre -90 et 200",
      });
      return z.NEVER;
    }
    return decimal;
  }),
});

const schemaOrdreCategories = z.object({
  categories: z.string().transform((valeur, contexte) => {
    const categories = valeur
      .split(/\r?\n/)
      .map((ligne) => ligne.trim())
      .filter(Boolean);
    if (categories.length === 0) {
      contexte.addIssue({ code: "custom", message: "Ajoutez au moins une categorie" });
      return z.NEVER;
    }
    if (
      new Set(categories.map((categorie) => categorie.toLowerCase())).size !==
      categories.length
    ) {
      contexte.addIssue({ code: "custom", message: "Une categorie est en doublon" });
      return z.NEVER;
    }
    return categories;
  }),
});

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Réessayez ou contactez l'administrateur.";

function erreurServeur(erreur: unknown, action: string): ResultatAction {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[produits:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (réf. ${idErreur})` };
}

export async function creerProduit(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaCreationProduit.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { nom, categorie, prix } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const doublon = await tx.produit.findFirst({
        where: { nom, deleted_at: null },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Un produit actif porte déjà ce nom" },
        };
      }

      const produit = await tx.produit.create({
        data: { nom, categorie, prix_reference: prix },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "produit.creation",
          entite: "produits",
          entiteId: produit.id,
          apres: { nom, categorie, prix_reference: prix },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/produits");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation");
  }
}

export async function modifierProduit(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaModificationProduit.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { id, nom, categorie } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.produit.findFirst({
        where: { id, deleted_at: null },
        select: { nom: true, categorie: true },
      });

      if (!existant) {
        return { ok: false as const, message: "Produit introuvable" };
      }

      const doublon = await tx.produit.findFirst({
        where: { nom, deleted_at: null, id: { not: id } },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Un produit actif porte déjà ce nom" },
        };
      }

      await tx.produit.update({ where: { id }, data: { nom, categorie } });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "produit.modification",
          entite: "produits",
          entiteId: id,
          avant: existant,
          apres: { nom, categorie },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/produits");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "modification");
  }
}

export async function changerPrixProduit(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaChangementPrix.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { id, nouveauPrix } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      // Verrou ligne : deux changements de prix simultanes se serialisent,
      // chaque entree d'historique garde le vrai ancien prix.
      const lignes = await tx.$queryRaw<Array<{ prix_reference: string }>>`
        SELECT prix_reference FROM produits
        WHERE id = ${id} AND deleted_at IS NULL
        FOR UPDATE
      `;
      const ancienPrix = lignes.at(0)?.prix_reference;

      if (ancienPrix === undefined) {
        return { ok: false as const, message: "Produit introuvable" };
      }

      await tx.produit.update({
        where: { id },
        data: { prix_reference: nouveauPrix },
      });

      await tx.historiquePrix.create({
        data: {
          produit_id: id,
          ancien_prix: ancienPrix,
          nouveau_prix: nouveauPrix,
          utilisateur_id: admin.id,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "produit.changement_prix",
          entite: "produits",
          entiteId: id,
          avant: { prix_reference: String(ancienPrix) },
          apres: { prix_reference: nouveauPrix },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/produits");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "changement_prix");
  }
}

export async function changerPrixEnMasse(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaPrixEnMasse.safeParse(entree);

  if (!validation.success) {
    // Cle d'erreur par produit (`prix_<id>`) quand la ligne fautive est identifiable.
    const erreurs: Record<string, string> = {};
    for (const probleme of validation.error.issues) {
      const [racine, index, champ] = probleme.path;
      if (racine === "lignes" && typeof index === "number" && champ === "nouveauPrix") {
        const entreeBrute = entree as { lignes?: Array<{ id?: string }> };
        const id = entreeBrute.lignes?.[index]?.id;
        erreurs[id ? `prix_${id}` : "_"] = probleme.message;
      } else {
        erreurs._ ??= probleme.message;
      }
    }

    return { ok: false, erreurs, message: erreurs._ };
  }

  const { lignes } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      for (const ligne of lignes) {
        const verrou = await tx.$queryRaw<Array<{ prix_reference: string }>>`
          SELECT prix_reference FROM produits
          WHERE id = ${ligne.id} AND deleted_at IS NULL
          FOR UPDATE
        `;
        const ancienPrix = verrou.at(0)?.prix_reference;

        if (ancienPrix === undefined) {
          // Rollback de tout le lot : mise a jour en masse = tout ou rien.
          throw new ErreurProduitIntrouvable(ligne.id);
        }

        if (String(ancienPrix) === ligne.nouveauPrix) {
          continue;
        }

        await tx.produit.update({
          where: { id: ligne.id },
          data: { prix_reference: ligne.nouveauPrix },
        });

        await tx.historiquePrix.create({
          data: {
            produit_id: ligne.id,
            ancien_prix: ancienPrix,
            nouveau_prix: ligne.nouveauPrix,
            utilisateur_id: admin.id,
          },
        });

        await ecrireAudit(
          tx,
          {
            utilisateurId: admin.id,
            action: "produit.changement_prix",
            entite: "produits",
            entiteId: ligne.id,
            avant: { prix_reference: String(ancienPrix) },
            apres: { prix_reference: ligne.nouveauPrix, lot: true },
          },
          ip,
        );
      }

      return { ok: true as const };
    });

    revalidatePath("/admin/produits");

    return resultat;
  } catch (erreur) {
    if (erreur instanceof ErreurProduitIntrouvable) {
      return {
        ok: false,
        message:
          "Un des produits n'existe plus ; aucun prix n'a été modifié. Rechargez la page.",
      };
    }

    return erreurServeur(erreur, "prix_en_masse");
  }
}

class ErreurProduitIntrouvable extends Error {
  constructor(public produitId: string) {
    super(`Produit introuvable : ${produitId}`);
  }
}

export async function definirActivationProduit(
  id: string,
  actif: boolean,
): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!id) {
    return { ok: false, message: "Produit introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.produit.findFirst({
        where: { id, deleted_at: null },
        select: { actif: true },
      });

      if (!existant) {
        return { ok: false as const, message: "Produit introuvable" };
      }

      await tx.produit.update({ where: { id }, data: { actif } });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: actif ? "produit.activation" : "produit.desactivation",
          entite: "produits",
          entiteId: id,
          avant: { actif: existant.actif },
          apres: { actif },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/produits");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "activation");
  }
}

export async function supprimerProduit(id: string): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!id) {
    return { ok: false, message: "Produit introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.produit.findFirst({
        where: { id, deleted_at: null },
        select: { nom: true, categorie: true, actif: true },
      });

      if (!existant) {
        return { ok: false as const, message: "Produit introuvable" };
      }

      await tx.produit.update({
        where: { id },
        data: { deleted_at: new Date(), actif: false },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "produit.suppression",
          entite: "produits",
          entiteId: id,
          avant: existant,
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/produits");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "suppression");
  }
}

export async function renommerCategorieProduit(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaRenommerCategorie.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { ancienneCategorie, nouvelleCategorie } = validation.data;

  try {
    const ip = await adresseIpRequete();
    const resultat = await prisma.$transaction(async (tx) => {
      const produits = await tx.produit.findMany({
        where: { categorie: ancienneCategorie, deleted_at: null },
        select: { id: true },
      });

      if (produits.length === 0) {
        return { ok: false as const, message: "Aucun produit dans cette categorie" };
      }

      await tx.produit.updateMany({
        where: { categorie: ancienneCategorie, deleted_at: null },
        data: { categorie: nouvelleCategorie },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "categorie.renommage",
          entite: "produits",
          entiteId: ancienneCategorie,
          avant: { categorie: ancienneCategorie, produits: produits.map((produit) => produit.id) },
          apres: { categorie: nouvelleCategorie },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/produits");
      revalidatePath("/admin/produits/categories");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "categorie_renommage");
  }
}

export async function appliquerPourcentageCategorie(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaPrixPourcentageCategorie.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { categorie, pourcentage } = validation.data;

  try {
    const ip = await adresseIpRequete();
    const resultat = await prisma.$transaction(async (tx) => {
      const produits = await tx.produit.findMany({
        where: { categorie, actif: true, deleted_at: null },
        select: { id: true, prix_reference: true },
      });

      if (produits.length === 0) {
        return { ok: false as const, message: "Aucun produit actif dans cette categorie" };
      }

      const facteur = new Decimal(1).plus(pourcentage.div(100));
      for (const produit of produits) {
        const ancien = new Decimal(produit.prix_reference);
        const nouveau = ancien.mul(facteur).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        await tx.produit.update({
          where: { id: produit.id },
          data: { prix_reference: nouveau.toFixed(2) },
        });
        await tx.historiquePrix.create({
          data: {
            produit_id: produit.id,
            ancien_prix: ancien.toFixed(2),
            nouveau_prix: nouveau.toFixed(2),
            utilisateur_id: admin.id,
          },
        });
      }

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "categorie.prix_pourcentage",
          entite: "produits",
          entiteId: categorie,
          avant: { categorie, pourcentage: pourcentage.toFixed(2), produits: produits.length },
          apres: { facteur: facteur.toFixed(4) },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/produits");
      revalidatePath("/admin/produits/categories");
      revalidatePath("/admin/produits/prix");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "categorie_prix");
  }
}

export async function enregistrerOrdreCategories(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaOrdreCategories.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  try {
    const ip = await adresseIpRequete();
    const categories = validation.data.categories;

    await prisma.$transaction(async (tx) => {
      const avant = await tx.parametreSysteme.findUnique({
        where: { cle: "categories_produits" },
        select: { valeur: true },
      });

      await tx.parametreSysteme.upsert({
        where: { cle: "categories_produits" },
        create: {
          cle: "categories_produits",
          valeur: JSON.stringify(categories),
          updated_by: admin.id,
        },
        update: {
          valeur: JSON.stringify(categories),
          updated_by: admin.id,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "categorie.ordre",
          entite: "parametres_systeme",
          entiteId: "categories_produits",
          avant: { categories: avant?.valeur ?? null },
          apres: { categories },
        },
        ip,
      );
    });

    revalidatePath("/admin/produits");
    revalidatePath("/admin/produits/categories");
    return { ok: true };
  } catch (erreur) {
    return erreurServeur(erreur, "categorie_ordre");
  }
}
