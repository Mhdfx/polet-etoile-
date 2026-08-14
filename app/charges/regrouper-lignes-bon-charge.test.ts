import { describe, expect, it } from "vitest";
import { regrouperLignesBonCharge } from "./regrouper-lignes-bon-charge";

describe("regrouperLignesBonCharge", () => {
  it("additionne quantites et montants de chaque produit", () => {
    const lignes = regrouperLignesBonCharge([
      { produitId: "abats", produit: "Abats", quantite: "1.000", montant: "18.00" },
      { produitId: "ailes", produit: "Ailes", quantite: "4.000", montant: "84.00" },
      { produitId: "abats", produit: "Abats", quantite: "2.000", montant: "36.00" },
      { produitId: "abats", produit: "Abats", quantite: "3.000", montant: "54.00" },
    ]);

    expect(
      lignes.map((ligne) => ({
        produit: ligne.produit,
        quantite: ligne.quantite.toFixed(3),
        montant: ligne.montant?.toFixed(2),
      })),
    ).toEqual([
      { produit: "Abats", quantite: "6.000", montant: "108.00" },
      { produit: "Ailes", quantite: "4.000", montant: "84.00" },
    ]);
  });

  it("laisse le montant absent si une occurrence n'est pas valorisee", () => {
    const [ligne] = regrouperLignesBonCharge([
      { produitId: "abats", produit: "Abats", quantite: "1.000", montant: "18.00" },
      { produitId: "abats", produit: "Abats", quantite: "2.000" },
    ]);

    expect(ligne.quantite.toFixed(3)).toBe("3.000");
    expect(ligne.montant).toBeUndefined();
  });
});
