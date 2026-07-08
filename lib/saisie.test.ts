import { describe, expect, it } from "vitest";
import {
  normaliserSaisieMontant,
  normaliserSaisieQuantite,
} from "@/lib/saisie";

describe("normaliserSaisieMontant", () => {
  it("accepte la virgule francaise", () => {
    expect(normaliserSaisieMontant("60037,50")).toBe("60037.50");
  });

  it("accepte le point", () => {
    expect(normaliserSaisieMontant("125.9")).toBe("125.9");
  });

  it("ignore les espaces milliers (dont insecables)", () => {
    expect(normaliserSaisieMontant("60 037,00")).toBe("60037.00");
    expect(normaliserSaisieMontant("60 037,00")).toBe("60037.00");
  });

  it("accepte un entier sans decimales", () => {
    expect(normaliserSaisieMontant("150")).toBe("150");
  });

  it("refuse plus de 2 decimales", () => {
    expect(normaliserSaisieMontant("10,123")).toBeNull();
  });

  it("refuse les valeurs non numeriques", () => {
    expect(normaliserSaisieMontant("")).toBeNull();
    expect(normaliserSaisieMontant("abc")).toBeNull();
    expect(normaliserSaisieMontant("12,3,4")).toBeNull();
    expect(normaliserSaisieMontant("-5")).toBeNull();
    expect(normaliserSaisieMontant("1e3")).toBeNull();
  });
});

describe("normaliserSaisieQuantite", () => {
  it("accepte 3 decimales (kg)", () => {
    expect(normaliserSaisieQuantite("2,375")).toBe("2.375");
  });

  it("refuse 4 decimales", () => {
    expect(normaliserSaisieQuantite("2,3755")).toBeNull();
  });
});
