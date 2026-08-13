import { describe, expect, it } from "vitest";
import { calculerMontantsBonCharge } from "./montants-bon-charge";

describe("calculerMontantsBonCharge", () => {
  it("valorise separement chaque occurrence avec son prix fige", () => {
    const montants = calculerMontantsBonCharge(
      [
        { produitId: "blanc", quantite: "2.000", prixNet: "40.00" },
        { produitId: "blanc", quantite: "3.000", prixNet: "75.00" },
      ],
      [
        { produitId: "blanc", quantite: "2.000" },
        { produitId: "blanc", quantite: "3.000" },
      ],
    );

    expect(montants.map((montant) => montant?.toFixed(2))).toEqual([
      "40.00",
      "75.00",
    ]);
  });

  it("ne fabrique aucun montant pour un BC sans prix source", () => {
    expect(
      calculerMontantsBonCharge([], [
        { produitId: "blanc", quantite: "4.000" },
      ]),
    ).toEqual([undefined]);
  });
});
