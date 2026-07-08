/**
 * Normalisation des saisies numeriques en francais (virgule decimale,
 * espaces milliers) vers une chaine canonique a point, prete pour Decimal/Zod.
 */

export type OptionsSaisieDecimale = {
  decimalesMax: number;
};

export function normaliserSaisieDecimale(
  texte: string,
  { decimalesMax }: OptionsSaisieDecimale,
): string | null {
  const nettoye = texte
    .trim()
    .replace(/[\s  ]/g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d*)?$/.test(nettoye)) {
    return null;
  }

  const [entier, decimales = ""] = nettoye.split(".");

  if (decimales.length > decimalesMax) {
    return null;
  }

  return decimales.length > 0 ? `${entier}.${decimales}` : entier;
}

export function normaliserSaisieMontant(texte: string): string | null {
  return normaliserSaisieDecimale(texte, { decimalesMax: 2 });
}

export function normaliserSaisieQuantite(texte: string): string | null {
  return normaliserSaisieDecimale(texte, { decimalesMax: 3 });
}
