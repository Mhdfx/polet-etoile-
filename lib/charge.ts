import Decimal from "decimal.js";
import { arrondirMontant, arrondirQuantite, type EntreeDecimal } from "@/lib/decimal";

// -- Saisie d'un bon de charge -------------------------------------------------

export type LigneChargeCalculee = {
  produitId: string;
  quantite: string;
};

export class ProduitChargeIntrouvable extends Error {
  constructor(public produitId: string) {
    super(`Produit de charge introuvable ou non suivi en stock : ${produitId}`);
  }
}

export class ProduitChargeDuplique extends Error {
  constructor(public produitId: string) {
    super(`Produit de charge duplique : ${produitId}`);
  }
}

/**
 * Valide et normalise les lignes d'un bon de charge : chaque produit doit
 * exister dans l'ensemble autorise (produits actifs suivis en stock) et
 * n'apparaitre qu'une fois. Quantites en KG, Decimal(10,3). Aucun prix : un
 * bon de charge est du stock, pas une vente.
 */
export function calculerLignesCharge(
  lignes: Array<{ produitId: string; quantite: string }>,
  produitsAutorises: Array<{ id: string }>,
): LigneChargeCalculee[] {
  const idsAutorises = new Set(produitsAutorises.map((produit) => produit.id));
  const produitsVus = new Set<string>();

  return lignes.map((ligne) => {
    if (produitsVus.has(ligne.produitId)) {
      throw new ProduitChargeDuplique(ligne.produitId);
    }
    produitsVus.add(ligne.produitId);

    if (!idsAutorises.has(ligne.produitId)) {
      throw new ProduitChargeIntrouvable(ligne.produitId);
    }

    return {
      produitId: ligne.produitId,
      quantite: arrondirQuantite(ligne.quantite).toFixed(3),
    };
  });
}

// -- Rapprochement de tournee (charge - vendu - retourne) ----------------------

export type MouvementProduit = {
  produitId: string;
  quantite: EntreeDecimal;
};

export type ProduitReference = {
  id: string;
  nom: string;
  prix_reference: EntreeDecimal;
};

export type LigneReconciliation = {
  produitId: string;
  nom: string;
  charge: Decimal;
  vendu: Decimal;
  retourne: Decimal;
  ecart: Decimal;
  ecartValorise: Decimal;
};

export type Reconciliation = {
  lignes: LigneReconciliation[];
  totalCharge: Decimal;
  totalVendu: Decimal;
  totalRetourne: Decimal;
  totalEcart: Decimal;
  /** Valeur DH du manquant (positif) ou de la survente (negatif). */
  totalEcartValorise: Decimal;
};

function agregerParProduit(mouvements: MouvementProduit[]): Map<string, Decimal> {
  const somme = new Map<string, Decimal>();

  for (const mouvement of mouvements) {
    const actuel = somme.get(mouvement.produitId) ?? new Decimal(0);
    somme.set(mouvement.produitId, actuel.plus(mouvement.quantite));
  }

  return somme;
}

/**
 * Rapprochement par produit sur une periode / un commercial :
 *   ecart = charge - vendu - retourne   (en KG, Decimal(10,3))
 *   ecart > 0 -> manquant (perte, casse, don, vente non saisie)
 *   ecart < 0 -> survente (chargement non saisi / erreur de donnee)
 * `ecartValorise = ecart x prix_reference` (DH). Les totaux sont des
 * projections calculees, jamais stockees.
 *
 * Seuls les produits fournis dans `produits` (l'appelant y met les produits
 * suivis en stock qui apparaissent dans au moins un mouvement) sont pris en
 * compte : les pseudo-produits (RELIQUAT PAYEMENT) sont exclus en amont.
 */
export function calculerReconciliation(
  produits: ProduitReference[],
  charges: MouvementProduit[],
  ventes: MouvementProduit[],
  retours: MouvementProduit[],
): Reconciliation {
  const chargeParProduit = agregerParProduit(charges);
  const venteParProduit = agregerParProduit(ventes);
  const retourParProduit = agregerParProduit(retours);

  let totalCharge = new Decimal(0);
  let totalVendu = new Decimal(0);
  let totalRetourne = new Decimal(0);
  let totalEcart = new Decimal(0);
  let totalEcartValorise = new Decimal(0);

  const lignes: LigneReconciliation[] = produits.map((produit) => {
    const charge = arrondirQuantite(chargeParProduit.get(produit.id) ?? 0);
    const vendu = arrondirQuantite(venteParProduit.get(produit.id) ?? 0);
    const retourne = arrondirQuantite(retourParProduit.get(produit.id) ?? 0);
    const ecart = arrondirQuantite(charge.minus(vendu).minus(retourne));
    const ecartValorise = arrondirMontant(ecart.mul(produit.prix_reference));

    totalCharge = totalCharge.plus(charge);
    totalVendu = totalVendu.plus(vendu);
    totalRetourne = totalRetourne.plus(retourne);
    totalEcart = totalEcart.plus(ecart);
    totalEcartValorise = totalEcartValorise.plus(ecartValorise);

    return { produitId: produit.id, nom: produit.nom, charge, vendu, retourne, ecart, ecartValorise };
  });

  // Les plus gros ecarts valorises (en valeur absolue) d'abord : c'est la
  // lecture anti-demarque la plus utile pour l'admin.
  lignes.sort((a, b) => {
    const diff = b.ecartValorise.abs().comparedTo(a.ecartValorise.abs());
    return diff !== 0 ? diff : a.nom.localeCompare(b.nom, "fr");
  });

  return {
    lignes,
    totalCharge: arrondirQuantite(totalCharge),
    totalVendu: arrondirQuantite(totalVendu),
    totalRetourne: arrondirQuantite(totalRetourne),
    totalEcart: arrondirQuantite(totalEcart),
    totalEcartValorise: arrondirMontant(totalEcartValorise),
  };
}
