import { z } from "zod";
import { normaliserSaisieMontant, normaliserSaisieQuantite } from "@/lib/saisie";

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

const ligneCommande = z.object({
  produitId: champId,
  quantite: champQuantite,
});

const baseCommande = z.object({
  lignes: z
    .array(ligneCommande)
    .min(1, "Ajouter au moins une ligne de commande")
    .max(60, "Une commande ne peut pas depasser 60 lignes"),
  totalAnnonce: z
    .string()
    .optional()
    .transform((valeur, contexte) => {
      if (!valeur) {
        return undefined;
      }

      const normalise = normaliserSaisieMontant(valeur);
      if (normalise === null) {
        contexte.addIssue({
          code: "custom",
          message: "Le total annonce doit etre un montant valide",
        });
        return z.NEVER;
      }

      return normalise;
    }),
});

export const schemaCreationCommandeCommercial = baseCommande.extend({
  clientId: champId,
});

export const schemaCreationCommandeAdmin = baseCommande
  .extend({
    commercialId: champId,
    typeClient: z.enum(["STANDARD", "EXTERNE"], {
      message: "Le type de client est obligatoire",
    }),
    clientId: z.string().optional(),
    clientExterneId: z.string().optional(),
  })
  .superRefine((valeur, contexte) => {
    if (valeur.typeClient === "STANDARD" && !valeur.clientId) {
      contexte.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Choisir un client standard",
      });
    }

    if (valeur.typeClient === "EXTERNE" && !valeur.clientExterneId) {
      contexte.addIssue({
        code: "custom",
        path: ["clientExterneId"],
        message: "Choisir un client externe",
      });
    }
  });

export const schemaCreationCommande = z.discriminatedUnion("source", [
  schemaCreationCommandeCommercial.extend({ source: z.literal("COMMERCIAL") }),
  schemaCreationCommandeAdmin.extend({ source: z.literal("ADMIN") }),
]);

export const schemaAjoutPaiement = z.object({
  commandeId: champId,
  montant: z.string().transform((valeur, contexte) => {
    const normalise = normaliserSaisieMontant(valeur);

    if (normalise === null || Number.parseFloat(normalise) <= 0) {
      contexte.addIssue({
        code: "custom",
        message: "Le paiement doit etre un montant superieur a 0",
      });
      return z.NEVER;
    }

    return normalise;
  }),
  modePaiement: z.enum(["ESPECES", "CHEQUE", "TRAITE", "AUTRE"], {
    message: "Le mode de paiement est obligatoire",
  }),
  reference: z
    .string()
    .trim()
    .max(120, "La reference ne doit pas depasser 120 caracteres")
    .optional()
    .transform((valeur) => (valeur ? valeur : undefined)),
});

export type CreationCommande = z.infer<typeof schemaCreationCommande>;
export type CreationCommandeCommercial = z.infer<
  typeof schemaCreationCommandeCommercial
>;
export type CreationCommandeAdmin = z.infer<typeof schemaCreationCommandeAdmin>;
export type AjoutPaiement = z.infer<typeof schemaAjoutPaiement>;
