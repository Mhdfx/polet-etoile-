import { describe, expect, it } from "vitest";
import {
  calculerCommande,
  ProduitCommandeDuplique,
  ProduitCommandeIntrouvable,
  totalsIdentiques,
} from "./commandes";

describe("calculerCommande", () => {
  it("calcule les prix nets en Decimal et le total", () => {
    const resultat = calculerCommande(
      [
        { produitId: "p1", quantite: "12.500" },
        { produitId: "p2", quantite: "3.250" },
      ],
      [
        { id: "p1", prix_reference: "23.50" },
        { id: "p2", prix_reference: "48.00" },
      ],
    );

    expect(resultat.lignes).toEqual([
      {
        produitId: "p1",
        quantite: "12.500",
        prixReference: "23.50",
        prixUnitaire: "23.50",
        prixPersonnalise: false,
        prixNet: "293.75",
      },
      {
        produitId: "p2",
        quantite: "3.250",
        prixReference: "48.00",
        prixUnitaire: "48.00",
        prixPersonnalise: false,
        prixNet: "156.00",
      },
    ]);
    expect(resultat.total).toBe("449.75");
  });

  it("applique un prix personnalise uniquement quand il est explicitement autorise", () => {
    const ligne = [{ produitId: "p1", quantite: "2.000", prixUnitaire: "19.90" }];
    const produits = [{ id: "p1", prix_reference: "23.50" }];

    const commercial = calculerCommande(ligne, produits);
    const admin = calculerCommande(ligne, produits, {
      autoriserPrixPersonnalise: true,
    });

    expect(commercial.lignes[0]).toMatchObject({
      prixReference: "23.50",
      prixUnitaire: "23.50",
      prixPersonnalise: false,
      prixNet: "47.00",
    });
    expect(admin.lignes[0]).toMatchObject({
      prixReference: "23.50",
      prixUnitaire: "19.90",
      prixPersonnalise: true,
      prixNet: "39.80",
    });
  });

  it("refuse un produit absent de la selection active", () => {
    expect(() =>
      calculerCommande([{ produitId: "p-inactif", quantite: "1.000" }], []),
    ).toThrow(ProduitCommandeIntrouvable);
  });

  it("refuse deux lignes pour le meme produit", () => {
    expect(() =>
      calculerCommande(
        [
          { produitId: "p1", quantite: "1.000" },
          { produitId: "p1", quantite: "2.000" },
        ],
        [{ id: "p1", prix_reference: "10.00" }],
      ),
    ).toThrow(ProduitCommandeDuplique);
  });
});

describe("totalsIdentiques", () => {
  it("compare les montants a deux decimales", () => {
    expect(totalsIdentiques("449.750", "449.75")).toBe(true);
    expect(totalsIdentiques("449.74", "449.75")).toBe(false);
  });
});
