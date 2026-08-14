import Decimal from "decimal.js";
import { regrouperLignesBonCharge } from "./regrouper-lignes-bon-charge";

export type CommandePourBonChargeConsolide = {
  lignes: Array<{
    produit: {
      id: string;
      nom: string;
    };
    quantite: Decimal.Value;
    prixNet: Decimal.Value;
  }>;
};

export type LigneBonChargeConsolideCalculee = {
  produit: string;
  quantite: Decimal;
  montant: Decimal;
};

/**
 * Consolide toutes les occurrences d'un produit dans les commandes
 * selectionnees. Quantites et montants figes sont additionnes en Decimal.
 */
export function construireLignesBonChargeConsolide(
  commandes: CommandePourBonChargeConsolide[],
): LigneBonChargeConsolideCalculee[] {
  return regrouperLignesBonCharge(
    commandes.flatMap((commande) =>
      commande.lignes.map((ligne) => ({
        produitId: ligne.produit.id,
        produit: ligne.produit.nom,
        quantite: ligne.quantite,
        montant: ligne.prixNet,
      })),
    ),
  ).map((ligne) => ({
    produit: ligne.produit,
    quantite: ligne.quantite,
    montant: ligne.montant ?? new Decimal(0),
  }));
}
