import { describe, expect, it } from "vitest";
import { construireLignesBonChargeConsolide } from "./lignes-bon-charge-consolide";

describe("construireLignesBonChargeConsolide", () => {
  it("conserve trois occurrences du meme produit avec leurs valeurs propres", () => {
    const lignes = construireLignesBonChargeConsolide([
      {
        lignes: [
          { produit: { nom: "Blanc" }, quantite: "2.000", prixNet: "40.00" },
          { produit: { nom: "Ailes" }, quantite: "1.000", prixNet: "15.00" },
        ],
      },
      {
        lignes: [
          { produit: { nom: "Blanc" }, quantite: "3.000", prixNet: "75.00" },
        ],
      },
      {
        lignes: [
          { produit: { nom: "Blanc" }, quantite: "4.000", prixNet: "96.00" },
        ],
      },
    ]);

    expect(lignes.map((ligne) => ligne.produit)).toEqual([
      "Blanc",
      "Ailes",
      "Blanc",
      "Blanc",
    ]);
    expect(
      lignes
        .filter((ligne) => ligne.produit === "Blanc")
        .map((ligne) => ({
          quantite: ligne.quantite.toFixed(3),
          montant: ligne.montant.toFixed(2),
        })),
    ).toEqual([
      { quantite: "2.000", montant: "40.00" },
      { quantite: "3.000", montant: "75.00" },
      { quantite: "4.000", montant: "96.00" },
    ]);
  });
});
