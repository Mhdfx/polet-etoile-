import { describe, expect, it } from "vitest";
import {
  agregerMouvementsParJour,
  agregerMouvementsProduits,
  type MouvementProduitJournalier,
} from "@/lib/mouvements-produits";

const produits = [
  { id: "p2", nom: "Blanc", actif: true },
  { id: "p1", nom: "Ailes", actif: true },
  { id: "p3", nom: "Cou", actif: false },
];

const mouvements: MouvementProduitJournalier[] = [
  { produitId: "p1", type: "CHARGE", quantite: "10.125", jour: "2026-08-18" },
  { produitId: "p1", type: "VENTE", quantite: "3.100", jour: "2026-08-18" },
  { produitId: "p1", type: "RETOUR", quantite: "1.025", jour: "2026-08-19" },
  { produitId: "p2", type: "VENTE", quantite: "2.500", jour: "2026-08-19" },
];

describe("mouvements produits", () => {
  it("conserve les produits sans mouvement et calcule l'ecart en Decimal", () => {
    const resultat = agregerMouvementsProduits(produits, mouvements);

    expect(resultat.map((ligne) => ligne.nom)).toEqual(["Ailes", "Blanc", "Cou"]);
    expect(resultat[0].charge.toFixed(3)).toBe("10.125");
    expect(resultat[0].ecart.toFixed(3)).toBe("6.000");
    expect(resultat[0].nombreMouvements).toBe(3);
    expect(resultat[0].dernierJour).toBe("2026-08-19");
    expect(resultat[2].ecart.toFixed(3)).toBe("0.000");
    expect(resultat[2].dernierJour).toBeNull();
  });

  it("produit une serie chronologique par jour", () => {
    const serie = agregerMouvementsParJour(mouvements);

    expect(serie.map((point) => point.jour)).toEqual(["2026-08-18", "2026-08-19"]);
    expect(serie[0].charge.toFixed(3)).toBe("10.125");
    expect(serie[1].vendu.toFixed(3)).toBe("2.500");
    expect(serie[1].retourne.toFixed(3)).toBe("1.025");
  });
});
