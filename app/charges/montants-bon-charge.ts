import Decimal from "decimal.js";

type LigneCommandePrix = {
  produitId: string;
  quantite: Decimal.Value;
  prixNet: Decimal.Value;
};

type LigneCharge = {
  produitId: string;
  quantite: Decimal.Value;
};

/**
 * Valorise les quantites chargees avec les prix figes de la commande source.
 * Une ligne sans prix source reste volontairement non valorisee (BC manuel).
 */
export function calculerMontantsBonCharge(
  lignesCommande: LigneCommandePrix[],
  lignesCharge: LigneCharge[],
): Array<Decimal | undefined> {
  const prixParProduit = new Map<
    string,
    Array<{ quantite: Decimal; montant: Decimal }>
  >();

  for (const ligne of lignesCommande) {
    const occurrences = prixParProduit.get(ligne.produitId) ?? [];
    occurrences.push({
      quantite: new Decimal(ligne.quantite),
      montant: new Decimal(ligne.prixNet),
    });
    prixParProduit.set(ligne.produitId, occurrences);
  }

  return lignesCharge.map((ligne) => {
    const prix = prixParProduit.get(ligne.produitId)?.shift();
    if (!prix || prix.quantite.isZero()) return undefined;

    return prix.montant.div(prix.quantite).mul(ligne.quantite);
  });
}
