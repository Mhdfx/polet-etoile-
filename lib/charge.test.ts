import { describe, expect, it } from "vitest";
import {
  calculerLignesCharge,
  calculerReconciliation,
  ProduitChargeDuplique,
  ProduitChargeIntrouvable,
  type ProduitReference,
} from "@/lib/charge";
import { formaterNumeroBc } from "@/lib/bc";

describe("calculerLignesCharge", () => {
  const produits = [{ id: "p1" }, { id: "p2" }];

  it("normalise les quantites en KG a 3 decimales", () => {
    // Les quantites arrivent deja normalisees (point decimal) depuis Zod.
    const lignes = calculerLignesCharge(
      [
        { produitId: "p1", quantite: "12.5" },
        { produitId: "p2", quantite: "3" },
      ],
      produits,
    );

    expect(lignes).toEqual([
      { produitId: "p1", quantite: "12.500" },
      { produitId: "p2", quantite: "3.000" },
    ]);
  });

  it("rejette un produit hors de l'ensemble autorise", () => {
    expect(() =>
      calculerLignesCharge([{ produitId: "inconnu", quantite: "1" }], produits),
    ).toThrow(ProduitChargeIntrouvable);
  });

  it("rejette un produit duplique", () => {
    expect(() =>
      calculerLignesCharge(
        [
          { produitId: "p1", quantite: "1" },
          { produitId: "p1", quantite: "2" },
        ],
        produits,
      ),
    ).toThrow(ProduitChargeDuplique);
  });
});

describe("calculerReconciliation", () => {
  const produits: ProduitReference[] = [
    { id: "p1", nom: "Blanc", prix_reference: "48.00" },
    { id: "p2", nom: "Cuisse", prix_reference: "28.00" },
    { id: "p3", nom: "Aile", prix_reference: "21.00" },
  ];

  it("ecart = charge - vendu - retourne, valorise au prix de reference", () => {
    const recon = calculerReconciliation(
      produits,
      [
        { produitId: "p1", quantite: "100" },
        { produitId: "p2", quantite: "50" },
        { produitId: "p3", quantite: "10" },
      ],
      [
        { produitId: "p1", quantite: "90" },
        { produitId: "p2", quantite: "55" }, // survente
      ],
      [{ produitId: "p1", quantite: "5" }],
    );

    const p1 = recon.lignes.find((l) => l.produitId === "p1")!;
    expect(p1.charge.toFixed(3)).toBe("100.000");
    expect(p1.vendu.toFixed(3)).toBe("90.000");
    expect(p1.retourne.toFixed(3)).toBe("5.000");
    expect(p1.ecart.toFixed(3)).toBe("5.000"); // manquant 5 kg
    expect(p1.ecartValorise.toFixed(2)).toBe("240.00"); // 5 x 48

    const p2 = recon.lignes.find((l) => l.produitId === "p2")!;
    expect(p2.ecart.toFixed(3)).toBe("-5.000"); // survente
    expect(p2.ecartValorise.toFixed(2)).toBe("-140.00"); // -5 x 28

    const p3 = recon.lignes.find((l) => l.produitId === "p3")!;
    expect(p3.ecart.toFixed(3)).toBe("10.000"); // charge, jamais vendu ni retourne
  });

  it("additionne charges multiples du meme produit (rechargement)", () => {
    const recon = calculerReconciliation(
      [produits[0]],
      [
        { produitId: "p1", quantite: "40" },
        { produitId: "p1", quantite: "60" },
      ],
      [{ produitId: "p1", quantite: "100" }],
      [],
    );

    const p1 = recon.lignes[0];
    expect(p1.charge.toFixed(3)).toBe("100.000");
    expect(p1.ecart.toFixed(3)).toBe("0.000"); // tournee parfaite
  });

  it("calcule les totaux et le manquant valorise global", () => {
    const recon = calculerReconciliation(
      produits,
      [
        { produitId: "p1", quantite: "100" },
        { produitId: "p2", quantite: "50" },
        { produitId: "p3", quantite: "10" },
      ],
      [
        { produitId: "p1", quantite: "90" },
        { produitId: "p2", quantite: "55" },
      ],
      [{ produitId: "p1", quantite: "5" }],
    );

    expect(recon.totalCharge.toFixed(3)).toBe("160.000");
    expect(recon.totalVendu.toFixed(3)).toBe("145.000");
    expect(recon.totalRetourne.toFixed(3)).toBe("5.000");
    expect(recon.totalEcart.toFixed(3)).toBe("10.000");
    // 240 (p1) - 140 (p2) + 210 (p3, 10x21) = 310
    expect(recon.totalEcartValorise.toFixed(2)).toBe("310.00");
  });

  it("classe les plus gros ecarts valorises (valeur absolue) en premier", () => {
    const recon = calculerReconciliation(
      produits,
      [{ produitId: "p3", quantite: "100" }],
      [{ produitId: "p2", quantite: "40" }],
      [],
    );

    // p3 manquant 100x21 = 2100 ; p2 survente 40x28 = 1120 ; p1 = 0
    expect(recon.lignes.map((l) => l.produitId)).toEqual(["p3", "p2", "p1"]);
  });
});

describe("formaterNumeroBc", () => {
  it("prefixe et pad sur 6 chiffres", () => {
    expect(formaterNumeroBc(1)).toBe("BC-000001");
    expect(formaterNumeroBc(1234, "CP")).toBe("CP-001234");
  });
});
