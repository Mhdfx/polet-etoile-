import type { PrismaClient } from "@prisma/client";
import {
  CATALOGUE_VERSION,
  PRODUITS_CDC,
  idProduitCdc,
} from "@/lib/catalogue-cdc";

export type ResultatSyncCatalogue = {
  catalogueVersion: string;
  appVersion: string | null;
  produitsCrees: number;
  produitsMisAJour: number;
  produitsReactive: number;
  prixMisAJour: boolean;
};

export type OptionsSyncCatalogue = {
  /** Met a jour prix_reference depuis le CDC (defaut false en production). */
  mettreAJourPrix?: boolean;
  /** Version applicative a enregistrer (ex. package.json). */
  versionApp?: string;
  /** Utilisateur admin pour updated_by des parametres version. */
  utilisateurId?: string | null;
};

/**
 * Synchronise le catalogue CDC en base sans toucher aux utilisateurs ni aux
 * commandes/clients. Idempotent : relancable apres chaque deploiement.
 */
export async function syncCatalogueCdc(
  prisma: PrismaClient,
  options: OptionsSyncCatalogue = {},
): Promise<ResultatSyncCatalogue> {
  const mettreAJourPrix = options.mettreAJourPrix ?? false;
  let produitsCrees = 0;
  let produitsMisAJour = 0;
  let produitsReactive = 0;

  for (const produit of PRODUITS_CDC) {
    const id = idProduitCdc(produit.ordre_affichage);
    const suiviStock = produit.suivi_stock ?? true;
    const existant = await prisma.produit.findUnique({
      where: { id },
      select: { id: true, actif: true, deleted_at: true },
    });

    const donneesCommunes = {
      nom: produit.nom,
      categorie: produit.categorie,
      unite: "kg" as const,
      ordre_affichage: produit.ordre_affichage,
      suivi_stock: suiviStock,
      actif: true,
      deleted_at: null,
    };

    if (!existant) {
      await prisma.produit.create({
        data: {
          id,
          ...donneesCommunes,
          prix_reference: produit.prix_reference,
        },
      });
      produitsCrees += 1;
      continue;
    }

    if (!existant.actif || existant.deleted_at) {
      produitsReactive += 1;
    }

    await prisma.produit.update({
      where: { id },
      data: {
        ...donneesCommunes,
        ...(mettreAJourPrix ? { prix_reference: produit.prix_reference } : {}),
      },
    });
    produitsMisAJour += 1;
  }

  const updatedBy = options.utilisateurId ?? null;

  await prisma.parametreSysteme.upsert({
    where: { cle: "catalogue_version" },
    create: { cle: "catalogue_version", valeur: CATALOGUE_VERSION, updated_by: updatedBy },
    update: { valeur: CATALOGUE_VERSION, updated_by: updatedBy },
  });

  if (options.versionApp) {
    await prisma.parametreSysteme.upsert({
      where: { cle: "app_version" },
      create: { cle: "app_version", valeur: options.versionApp, updated_by: updatedBy },
      update: { valeur: options.versionApp, updated_by: updatedBy },
    });
  }

  return {
    catalogueVersion: CATALOGUE_VERSION,
    appVersion: options.versionApp ?? null,
    produitsCrees,
    produitsMisAJour,
    produitsReactive,
    prixMisAJour: mettreAJourPrix,
  };
}
