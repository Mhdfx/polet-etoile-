import Decimal from "decimal.js";

export type LigneBonChargeSource = {
  produitId: string;
  produit: string;
  quantite: Decimal.Value;
  montant?: Decimal.Value;
};

export type LigneBonChargeGroupee = {
  produitId: string;
  produit: string;
  quantite: Decimal;
  montant?: Decimal;
};

/**
 * Regroupe toutes les occurrences d'un meme produit sur une seule ligne BC.
 * L'ordre de premiere apparition est conserve. Un montant n'est affiche que
 * lorsque toutes les occurrences du produit sont valorisees.
 */
export function regrouperLignesBonCharge(
  lignes: LigneBonChargeSource[],
): LigneBonChargeGroupee[] {
  const groupes = new Map<string, LigneBonChargeGroupee>();

  for (const ligne of lignes) {
    const existante = groupes.get(ligne.produitId);
    const montant = ligne.montant === undefined ? undefined : new Decimal(ligne.montant);

    if (!existante) {
      groupes.set(ligne.produitId, {
        produitId: ligne.produitId,
        produit: ligne.produit,
        quantite: new Decimal(ligne.quantite),
        montant,
      });
      continue;
    }

    existante.quantite = existante.quantite.plus(ligne.quantite);
    existante.montant =
      existante.montant === undefined || montant === undefined
        ? undefined
        : existante.montant.plus(montant);
  }

  return [...groupes.values()];
}
