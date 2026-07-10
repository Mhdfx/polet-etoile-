import { z } from "zod";
import { dateLocaleCasablanca } from "@/lib/dates";
import { normaliserSaisieQuantite } from "@/lib/saisie";

const champId = z.string().min(1, "Identifiant introuvable");

const champQuantite = z.string().transform((valeur, contexte) => {
  const normalise = normaliserSaisieQuantite(valeur);

  if (normalise === null || Number.parseFloat(normalise) <= 0) {
    contexte.addIssue({
      code: "custom",
      message: "La quantite doit etre superieure a 0 kg (ex. 12,500)",
    });
    return z.NEVER;
  }

  return normalise;
});

const ligneCharge = z.object({
  produitId: champId,
  quantite: champQuantite,
});

export const schemaCreationBonCharge = z.object({
  commercialId: champId,
  // Date de tournee optionnelle (JJ format ISO date). Absente -> maintenant.
  dateCharge: z
    .string()
    .optional()
    .transform((valeur, contexte) => {
      if (!valeur) {
        return undefined;
      }

      const date = dateLocaleCasablanca(valeur);
      if (!date.isValid) {
        contexte.addIssue({ code: "custom", message: "Date de charge invalide" });
        return z.NEVER;
      }

      return date.toUTC().toJSDate();
    }),
  commentaire: z
    .string()
    .trim()
    .max(500, "Le commentaire ne doit pas depasser 500 caracteres")
    .optional()
    .transform((valeur) => (valeur ? valeur : undefined)),
  lignes: z
    .array(ligneCharge)
    .min(1, "Ajouter au moins un produit charge")
    .max(60, "Un bon de charge ne peut pas depasser 60 lignes"),
});

export type CreationBonCharge = z.infer<typeof schemaCreationBonCharge>;
