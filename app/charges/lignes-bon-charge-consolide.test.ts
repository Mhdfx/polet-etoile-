import { describe, expect, it } from "vitest";
import { construireLignesBonChargeConsolide } from "./lignes-bon-charge-consolide";

describe("construireLignesBonChargeConsolide", () => {
  it("regroupe les occurrences du meme produit avec leurs totaux", () => {
    const lignes = construireLignesBonChargeConsolide([
      {
        lignes: [
          { produit: { id: "blanc", nom: "Blanc" }, quantite: "2.000", prixNet: "40.00" },
          { produit: { id: "ailes", nom: "Ailes" }, quantite: "1.000", prixNet: "15.00" },
        ],
      },
      {
        lignes: [
          { produit: { id: "blanc", nom: "Blanc" }, quantite: "3.000", prixNet: "75.00" },
        ],
      },
      {
        lignes: [
          { produit: { id: "blanc", nom: "Blanc" }, quantite: "4.000", prixNet: "96.00" },
        ],
      },
    ]);

    expect(
      lignes.map((ligne) => ({
        produit: ligne.produit,
        quantite: ligne.quantite.toFixed(3),
        montant: ligne.montant.toFixed(2),
      })),
    ).toEqual([
      { produit: "Blanc", quantite: "9.000", montant: "211.00" },
      { produit: "Ailes", quantite: "1.000", montant: "15.00" },
    ]);
  });
});
