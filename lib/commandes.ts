import Decimal from "decimal.js";
import { calculerPrixNet, sommerMontants, type EntreeDecimal } from "@/lib/decimal";

export type ProduitCommande = {
  id: string;
  prix_reference: EntreeDecimal;
};

export type LigneCommandeCalculee = {
  produitId: string;
  quantite: string;
  prixUnitaire: string;
  prixNet: string;
};

export type CommandeCalculee = {
  lignes: LigneCommandeCalculee[];
  total: string;
};

export class ProduitCommandeIntrouvable extends Error {
  constructor(public produitId: string) {
    super(`Produit commande introuvable : ${produitId}`);
  }
}

export class ProduitCommandeDuplique extends Error {
  constructor(public produitId: string) {
    super(`Produit commande duplique : ${produitId}`);
  }
}

export function calculerCommande(
  lignes: Array<{ produitId: string; quantite: string }>,
  produits: ProduitCommande[],
): CommandeCalculee {
  const produitsParId = new Map(produits.map((produit) => [produit.id, produit]));
  const produitsVus = new Set<string>();

  const lignesCalculees = lignes.map((ligne) => {
    if (produitsVus.has(ligne.produitId)) {
      throw new ProduitCommandeDuplique(ligne.produitId);
    }
    produitsVus.add(ligne.produitId);

    const produit = produitsParId.get(ligne.produitId);
    if (!produit) {
      throw new ProduitCommandeIntrouvable(ligne.produitId);
    }

    const prixNet = calculerPrixNet(ligne.quantite, produit.prix_reference);

    return {
      produitId: ligne.produitId,
      quantite: new Decimal(ligne.quantite).toFixed(3),
      prixUnitaire: new Decimal(produit.prix_reference).toFixed(2),
      prixNet: prixNet.toFixed(2),
    };
  });

  return {
    lignes: lignesCalculees,
    total: sommerMontants(lignesCalculees.map((ligne) => ligne.prixNet)).toFixed(2),
  };
}

export function totalsIdentiques(totalA: EntreeDecimal, totalB: EntreeDecimal): boolean {
  return new Decimal(totalA).toDecimalPlaces(2).eq(new Decimal(totalB).toDecimalPlaces(2));
}

export type LigneCommandeListe = {
  id: string;
  produit: string;
  quantite: string;
  prixUnitaire: string;
  prixNet: string;
};

export type CommandeDetail = {
  id: string;
  numeroBl: string;
  typeCommande: "STANDARD" | "EXTERNE";
  client: string;
  commercial: string;
  dateCommande: string;
  total: string;
  totalPaye: string;
  resteDu: string;
  statutPaiement: "paye" | "en_attente";
  lignes: LigneCommandeListe[];
};
