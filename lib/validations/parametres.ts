import { z } from "zod";
import { estCheminLogoPublic } from "@/lib/logo-upload";
import { normaliserSaisieMontant } from "@/lib/saisie";

const champTexteCourt = (nom: string, max = 180) =>
  z
    .string()
    .trim()
    .min(1, `${nom} est obligatoire`)
    .max(max, `${nom} ne doit pas depasser ${max} caracteres`);

const champTexteOptionnel = (max = 180) =>
  z
    .string()
    .trim()
    .max(max, `Le champ ne doit pas depasser ${max} caracteres`)
    .optional()
    .transform((valeur) => valeur || "");

const champTauxTva = z.string().transform((valeur, contexte) => {
  const normalise = normaliserSaisieMontant(valeur);
  if (normalise === null) {
    contexte.addIssue({ code: "custom", message: "Taux TVA invalide" });
    return z.NEVER;
  }

  const nombre = Number.parseFloat(normalise);
  if (nombre < 0 || nombre > 100) {
    contexte.addIssue({
      code: "custom",
      message: "Le taux TVA doit etre compris entre 0 et 100",
    });
    return z.NEVER;
  }

  return normalise;
});

export const schemaParametresSysteme = z.object({
  raisonSociale: champTexteCourt("La raison sociale"),
  ice: champTexteOptionnel(30),
  rc: champTexteOptionnel(40),
  identifiantFiscal: champTexteOptionnel(40),
  patente: champTexteOptionnel(40),
  adresse: champTexteOptionnel(500),
  telephone: champTexteOptionnel(40),
  logoUrl: z
    .string()
    .trim()
    .max(500, "Le chemin du logo ne doit pas depasser 500 caracteres")
    .optional()
    .transform((valeur, contexte) => {
      const texte = valeur || "";
      if (!texte) {
        return "";
      }
      if (!estCheminLogoPublic(texte)) {
        contexte.addIssue({
          code: "custom",
          message: "Le logo doit provenir de l'outil de televersement securise",
        });
        return z.NEVER;
      }
      return texte;
    }),
  tauxTva: champTauxTva,
  prefixeBl: champTexteCourt("Le prefixe BL", 20).regex(
    /^[A-Za-z0-9_-]+$/,
    "Le prefixe BL accepte lettres, chiffres, tirets et underscores",
  ),
  fuseauHoraire: champTexteCourt("Le fuseau horaire", 80),
});

export type ParametresSystemeInput = z.infer<typeof schemaParametresSysteme>;
