import { z } from "zod";
import { normaliserSaisieMontant } from "@/lib/saisie";

/** Resultat commun des actions serveur (mutations). */
export type ResultatAction =
  | { ok: true }
  | { ok: false; erreurs?: Record<string, string>; message?: string };

export function erreursParChamp(erreur: z.ZodError): Record<string, string> {
  const erreurs: Record<string, string> = {};

  for (const probleme of erreur.issues) {
    const champ = String(probleme.path[0] ?? "_");
    erreurs[champ] ??= probleme.message;
  }

  return erreurs;
}

/**
 * Champ montant saisi en chaine (virgule FR acceptee), normalise en chaine
 * canonique a point, strictement positif. Jamais converti en `number`.
 */
export function champMontantPositif(message: string) {
  return z.string().transform((valeur, contexte) => {
    const normalise = normaliserSaisieMontant(valeur);

    if (normalise === null || Number.parseFloat(normalise) <= 0) {
      contexte.addIssue({ code: "custom", message });
      return z.NEVER;
    }

    return normalise;
  });
}
