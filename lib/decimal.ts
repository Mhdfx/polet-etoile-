import Decimal from "decimal.js";

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export type EntreeDecimal = Decimal.Value;

export function decimal(valeur: EntreeDecimal): Decimal {
  return new Decimal(valeur);
}

export function arrondirMontant(valeur: EntreeDecimal): Decimal {
  return decimal(valeur).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function arrondirQuantite(valeur: EntreeDecimal): Decimal {
  return decimal(valeur).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

export function calculerPrixNet(quantite: EntreeDecimal, prixUnitaire: EntreeDecimal): Decimal {
  return arrondirMontant(decimal(quantite).mul(prixUnitaire));
}

export function sommerMontants(valeurs: EntreeDecimal[]): Decimal {
  return arrondirMontant(
    valeurs.reduce<Decimal>((total, valeur) => total.plus(valeur), new Decimal(0)),
  );
}

/** Somme de quantites en KG, arrondie a 3 decimales (jamais 2 comme un montant). */
export function sommerQuantites(valeurs: EntreeDecimal[]): Decimal {
  return arrondirQuantite(
    valeurs.reduce<Decimal>((total, valeur) => total.plus(valeur), new Decimal(0)),
  );
}

export function calculerResteDu(totalCommande: EntreeDecimal, paiements: EntreeDecimal[]): Decimal {
  return arrondirMontant(decimal(totalCommande).minus(sommerMontants(paiements)));
}
