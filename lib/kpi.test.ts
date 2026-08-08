import { describe, expect, it } from "vitest";
import {
  calculerImpayeTotal,
  calculerKpiCommandes,
  calculerKpiPeriode,
  calculerKpiPilotage,
  filtrerCommandesPeriode,
  formaterEntreesTop,
} from "./kpi";

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

describe("calculerKpiPilotage", () => {
  it("calcule panier, encaissement, reglement et clients distincts", () => {
    const kpi = calculerKpiPilotage([
      { client: { id: "c1" }, lignes: [{ prix_net: "100" }], paiements: [{ montant: "100" }] },
      { client: { id: "c1" }, lignes: [{ prix_net: "300" }], paiements: [{ montant: "100" }] },
      { client_externe: { id: "c2" }, lignes: [{ prix_net: "200" }], paiements: [{ montant: "200" }] },
    ]);
    expect(kpi.panierMoyen.toFixed(2)).toBe("200.00");
    expect(kpi.tauxEncaissement.toFixed(1)).toBe("66.7");
    expect(kpi.tauxCommandesReglees.toFixed(1)).toBe("66.7");
    expect(kpi.commandesReglees).toBe(2);
    expect(kpi.commandesTotal).toBe(3);
    expect(kpi.clientsServis).toBe(2);
  });

  it("calcule le taux d'encaissement par commandes reglees et non par montant", () => {
    const kpi = calculerKpiPilotage([
      { lignes: [{ prix_net: "1000" }], paiements: [{ montant: "1000" }] },
      { lignes: [{ prix_net: "10" }], paiements: [] },
    ]);

    expect(kpi.tauxEncaissement.toFixed(1)).toBe("50.0");
    expect(kpi.commandesReglees).toBe(1);
    expect(kpi.commandesTotal).toBe(2);
  });
});

describe("calculerKpiPeriode", () => {
  it("somme CA et quantite sur toutes les lignes", () => {
    const kpi = calculerKpiPeriode([
      {
        date_commande: new Date("2026-07-01T10:00:00Z"),
        lignes: [
          { prix_net: "235.00", quantite: "10.000" },
          { prix_net: "48.00", quantite: "1.500" },
        ],
      },
      {
        date_commande: new Date("2026-07-02T10:00:00Z"),
        lignes: [{ prix_net: "56.00", quantite: "2.000" }],
      },
    ]);

    expect(kpi.chiffreAffaires.toFixed(2)).toBe("339.00");
    expect(kpi.quantite.toFixed(3)).toBe("13.500");
    expect(kpi.nombreCommandes).toBe(2);
  });

  it("retourne zero sur periode vide", () => {
    const kpi = calculerKpiPeriode([]);

    expect(kpi.chiffreAffaires.toFixed(2)).toBe("0.00");
    expect(kpi.quantite.toFixed(3)).toBe("0.000");
    expect(kpi.nombreCommandes).toBe(0);
  });
});

describe("filtrerCommandesPeriode", () => {
  it("garde uniquement les commandes dans [debut, fin exclusive[", () => {
    const commandes = [
      { date_commande: new Date("2026-07-01T23:59:59Z") },
      { date_commande: new Date("2026-07-02T00:00:00Z") },
      { date_commande: new Date("2026-07-03T00:00:00Z") },
    ];

    const filtrees = filtrerCommandesPeriode(
      commandes,
      new Date("2026-07-02T00:00:00Z"),
      new Date("2026-07-03T00:00:00Z"),
    );

    expect(filtrees).toHaveLength(1);
    expect(filtrees[0].date_commande.toISOString()).toBe("2026-07-02T00:00:00.000Z");
  });
});

describe("calculerImpayeTotal", () => {
  it("ne compte que les restes dus positifs", () => {
    const impaye = calculerImpayeTotal([
      {
        lignes: [{ prix_net: "100.00" }],
        paiements: [{ montant: "40.00" }],
      },
      {
        lignes: [{ prix_net: "80.00" }],
        paiements: [{ montant: "80.00" }],
      },
      {
        // Trop-percu : ne doit pas reduire l'impaye global.
        lignes: [{ prix_net: "50.00" }],
        paiements: [{ montant: "70.00" }],
      },
    ]);

    expect(impaye.toFixed(2)).toBe("60.00");
  });
});
