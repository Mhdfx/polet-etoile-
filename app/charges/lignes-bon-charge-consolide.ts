import Decimal from "decimal.js";

export type CommandePourBonChargeConsolide = {
  lignes: Array<{
    produit: {
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
 * Conserve chaque occurrence d'un produit sur sa propre ligne. L'ordre des
 * commandes et des lignes fourni par l'appelant est respecte ; aucun produit
 * identique n'est fusionne.
 */
export function construireLignesBonChargeConsolide(
  commandes: CommandePourBonChargeConsolide[],
): LigneBonChargeConsolideCalculee[] {
  return commandes.flatMap((commande) =>
    commande.lignes.map((ligne) => ({
      produit: ligne.produit.nom,
      quantite: new Decimal(ligne.quantite),
      montant: new Decimal(ligne.prixNet),
    })),
  );
}
