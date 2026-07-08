import { describe, expect, it } from "vitest";
import { arrondirMontant, arrondirQuantite, calculerPrixNet, calculerResteDu, sommerMontants } from "@/lib/decimal";

describe("decimal", () => {
  it("calcule un prix net sans flottants JavaScript", () => {
    expect(calculerPrixNet("2.555", "23.40").toFixed(2)).toBe("59.79");
  });

  it("arrondit les montants à 2 décimales et les quantités à 3 décimales", () => {
    expect(arrondirMontant("10.235").toFixed(2)).toBe("10.24");
    expect(arrondirQuantite("1.2345").toFixed(3)).toBe("1.235");
  });

  it("somme les paiements et calcule le reste dû", () => {
    expect(sommerMontants(["100.10", "50.20", "0.70"]).toFixed(2)).toBe("151.00");
    expect(calculerResteDu("200.00", ["100.10", "50.20", "0.70"]).toFixed(2)).toBe("49.00");
  });
});
