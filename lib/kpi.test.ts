import { describe, expect, it } from "vitest";
import { calculerKpiCommandes, formaterEntreesTop } from "./kpi";

describe("calculerKpiCommandes", () => {
  it("calcule chiffre d'affaires, impaye et tops", () => {
    const kpi = calculerKpiCommandes([
      {
        client: { nom: "Boucherie Atlas" },
        lignes: [
          { prix_net: "100.00", produit: { nom: "Poulet entier" } },
          { prix_net: "50.00", produit: { nom: "Aile" } },
        ],
        paiements: [{ montant: "60.00" }],
      },
      {
        client_externe: { nom: "Traiteur Externe" },
        lignes: [{ prix_net: "200.00", produit: { nom: "Poulet entier" } }],
        paiements: [{ montant: "200.00" }],
      },
    ]);

    expect(kpi.chiffreAffaires.toFixed(2)).toBe("350.00");
    expect(kpi.nombreCommandes).toBe(2);
    expect(kpi.montantImpaye.toFixed(2)).toBe("90.00");
    expect(kpi.topClients[0]).toMatchObject({ label: "Traiteur Externe" });
    expect(kpi.topProduits[0]).toMatchObject({ label: "Poulet entier" });
    expect(kpi.topProduits[0].montant.toFixed(2)).toBe("300.00");
  });

  it("retourne zero et listes vides sur periode vide", () => {
    const kpi = calculerKpiCommandes([]);

    expect(kpi.chiffreAffaires.toFixed(2)).toBe("0.00");
    expect(kpi.nombreCommandes).toBe(0);
    expect(kpi.montantImpaye.toFixed(2)).toBe("0.00");
    expect(kpi.topClients).toEqual([]);
    expect(formaterEntreesTop(kpi.topProduits)).toEqual([]);
  });
});
