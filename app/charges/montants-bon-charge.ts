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
    { quantite: Decimal; montant: Decimal }
  >();

  for (const ligne of lignesCommande) {
    const courant = prixParProduit.get(ligne.produitId) ?? {
      quantite: new Decimal(0),
      montant: new Decimal(0),
    };
    courant.quantite = courant.quantite.plus(ligne.quantite);
    courant.montant = courant.montant.plus(ligne.prixNet);
    prixParProduit.set(ligne.produitId, courant);
  }

  return lignesCharge.map((ligne) => {
    const prix = prixParProduit.get(ligne.produitId);
    if (!prix || prix.quantite.isZero()) return undefined;

    return prix.montant.div(prix.quantite).mul(ligne.quantite);
  });
}
