import { z } from "zod";
import { normaliserSaisieQuantite } from "@/lib/saisie";

export const schemaCreationRetour = z.object({
  produitId: z.string().min(1, "Choisir un produit"),
  quantiteKg: z.string().transform((valeur, contexte) => {
    const normalise = normaliserSaisieQuantite(valeur);

    if (normalise === null || Number.parseFloat(normalise) <= 0) {
      contexte.addIssue({
        code: "custom",
        message: "La quantite retour doit etre superieure a 0 kg",
      });
      return z.NEVER;
    }

    return normalise;
  }),
  commentaire: z
    .string()
    .trim()
    .max(1000, "Le commentaire ne doit pas depasser 1000 caracteres")
    .optional()
    .transform((valeur) => (valeur ? valeur : undefined)),
});

export type CreationRetour = z.infer<typeof schemaCreationRetour>;
