import { describe, expect, it } from "vitest";
import { calculerMontantsBonCharge } from "./montants-bon-charge";

describe("calculerMontantsBonCharge", () => {
  it("utilise le prix fige pondere de la commande source", () => {
    const montants = calculerMontantsBonCharge(
      [
        { produitId: "blanc", quantite: "2.000", prixNet: "40.00" },
        { produitId: "blanc", quantite: "3.000", prixNet: "75.00" },
      ],
      [{ produitId: "blanc", quantite: "4.000" }],
    );

    expect(montants[0]?.toFixed(2)).toBe("92.00");
  });

  it("ne fabrique aucun montant pour un BC sans prix source", () => {
    expect(
      calculerMontantsBonCharge([], [
        { produitId: "blanc", quantite: "4.000" },
      ]),
    ).toEqual([undefined]);
  });
});
