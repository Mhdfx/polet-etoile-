import { z } from "zod";

const champId = z.string().min(1, "Identifiant introuvable");

const champNomClient = z
  .string()
  .trim()
  .min(2, "Le nom du client doit contenir au moins 2 caracteres")
  .max(180, "Le nom du client ne doit pas depasser 180 caracteres");

const champVille = z
  .string()
  .trim()
  .min(2, "La ville est obligatoire")
  .max(120, "La ville ne doit pas depasser 120 caracteres");

const champAdresse = z
  .string()
  .trim()
  .min(2, "L'adresse est obligatoire")
  .max(255, "L'adresse ne doit pas depasser 255 caracteres");

const champTelephone = z
  .string()
  .trim()
  .max(40, "Le telephone ne doit pas depasser 40 caracteres")
  .optional()
  .transform((valeur) => (valeur ? valeur : undefined));

export const schemaCreationClientAdmin = z.object({
  nom: champNomClient,
  regionVille: champVille,
  adresse: champAdresse,
  telephone: champTelephone,
  commercialId: champId,
  selectionCommande: z.boolean().optional(),
});

export const schemaModificationClientAdmin = schemaCreationClientAdmin.extend({
  id: champId,
});

export const schemaCreationClientCommercial = z.object({
  nom: champNomClient,
  regionVille: champVille,
  adresse: champAdresse,
  telephone: champTelephone,
  selectionCommande: z.boolean().optional(),
});

export const schemaModificationClientCommercial =
  schemaCreationClientCommercial.extend({
    id: champId,
  });

export const schemaCreationClientExterne = z.object({
  nom: champNomClient,
  regionVille: champVille,
  adresse: champAdresse,
  telephone: champTelephone,
});

export const schemaModificationClientExterne = schemaCreationClientExterne.extend({
  id: champId,
});

export type CreationClientAdmin = z.infer<typeof schemaCreationClientAdmin>;
export type ModificationClientAdmin = z.infer<typeof schemaModificationClientAdmin>;
export type CreationClientCommercial = z.infer<
  typeof schemaCreationClientCommercial
>;
export type ModificationClientCommercial = z.infer<
  typeof schemaModificationClientCommercial
>;
export type CreationClientExterne = z.infer<typeof schemaCreationClientExterne>;
export type ModificationClientExterne = z.infer<
  typeof schemaModificationClientExterne
>;
