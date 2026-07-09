import { z } from "zod";
import { champMontantPositif } from "@/lib/validations/commun";

export { erreursParChamp } from "@/lib/validations/commun";
export type { ResultatAction } from "@/lib/validations/commun";

/**
 * Schemas partages client/serveur pour le module Produits.
 * Le prix voyage toujours en chaine (saisie FR acceptee) et est normalise
 * en chaine canonique a point — jamais en `number`.
 */

const champNom = z
  .string()
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères")
  .max(180, "Le nom ne doit pas dépasser 180 caractères");

const champCategorie = z
  .string()
  .trim()
  .min(1, "La catégorie est obligatoire")
  .max(120, "La catégorie ne doit pas dépasser 120 caractères");

export const champPrix = champMontantPositif(
  "Le prix doit être un montant supérieur à 0 (ex. 45,50)",
);

export const schemaCreationProduit = z.object({
  nom: champNom,
  categorie: champCategorie,
  prix: champPrix,
});

export const schemaModificationProduit = z.object({
  id: z.string().min(1),
  nom: champNom,
  categorie: champCategorie,
});

export const schemaChangementPrix = z.object({
  id: z.string().min(1),
  nouveauPrix: champPrix,
});

export const schemaPrixEnMasse = z.object({
  lignes: z
    .array(z.object({ id: z.string().min(1), nouveauPrix: champPrix }))
    .min(1, "Aucun changement de prix à appliquer")
    .max(200, "Trop de changements en une fois (200 maximum)"),
});

export type CreationProduit = z.infer<typeof schemaCreationProduit>;
export type ModificationProduit = z.infer<typeof schemaModificationProduit>;
export type ChangementPrix = z.infer<typeof schemaChangementPrix>;
export type PrixEnMasse = z.infer<typeof schemaPrixEnMasse>;

