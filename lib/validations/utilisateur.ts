import { z } from "zod";
import { champMontantPositif } from "@/lib/validations/commun";

const champNomComplet = z
  .string()
  .trim()
  .min(2, "Le nom complet doit contenir au moins 2 caractères")
  .max(160, "Le nom complet ne doit pas dépasser 160 caractères");

const champNomUtilisateur = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,49}$/,
    "Le nom d'utilisateur doit contenir 3 à 50 caractères : lettres minuscules, chiffres, point, tiret ou underscore",
  );

const champMotDePasse = z
  .string()
  .min(6, "Le mot de passe doit contenir au moins 6 caractères")
  .max(128, "Le mot de passe ne doit pas dépasser 128 caractères");

const champRole = z.enum(["ADMIN", "COMMERCIAL"], {
  message: "Le rôle doit être Administrateur ou Commercial",
});

function avecConfirmation<T extends z.ZodRawShape>(objet: z.ZodObject<T>) {
  return objet.refine(
    (valeurs) =>
      (valeurs as { motDePasse: string; confirmation: string }).motDePasse ===
      (valeurs as { motDePasse: string; confirmation: string }).confirmation,
    {
      message: "La confirmation ne correspond pas au mot de passe",
      path: ["confirmation"],
    },
  );
}

export const schemaCreationUtilisateur = avecConfirmation(
  z.object({
    nomComplet: champNomComplet,
    nomUtilisateur: champNomUtilisateur,
    role: champRole,
    motDePasse: champMotDePasse,
    confirmation: z.string(),
  }),
);

export const schemaReinitialisationMotDePasse = avecConfirmation(
  z.object({
    id: z.string().min(1),
    motDePasse: champMotDePasse,
    confirmation: z.string(),
  }),
);

export const schemaObjectif = z.object({
  utilisateurId: z.string().min(1),
  mois: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Le mois doit être au format AAAA-MM"),
  montant: champMontantPositif(
    "L'objectif doit être un montant supérieur à 0 (ex. 60 000,00)",
  ),
});

export type CreationUtilisateur = z.infer<typeof schemaCreationUtilisateur>;
export type ReinitialisationMotDePasse = z.infer<
  typeof schemaReinitialisationMotDePasse
>;
export type Objectif = z.infer<typeof schemaObjectif>;
