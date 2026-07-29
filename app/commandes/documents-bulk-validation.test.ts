import { describe, expect, it } from "vitest";
import {
  validerCommandesDocuments,
  validerTypesDocuments,
} from "./documents-bulk-validation";

describe("validation export documents commandes", () => {
  it("dedoublonne les identifiants et accepte au maximum 100 commandes", () => {
    const formulaire = new FormData();
    for (let index = 0; index < 100; index += 1) {
      formulaire.append("commandeIds", `commande-${index}`);
    }
    formulaire.append("commandeIds", "commande-0");

    const resultat = validerCommandesDocuments(formulaire);

    expect(resultat).not.toBeInstanceOf(Response);
    expect(resultat).toHaveLength(100);
  });

  it("rejette une selection de plus de 100 commandes", async () => {
    const formulaire = new FormData();
    for (let index = 0; index < 101; index += 1) {
      formulaire.append("commandeIds", `commande-${index}`);
    }

    const resultat = validerCommandesDocuments(formulaire);

    expect(resultat).toBeInstanceOf(Response);
    expect((resultat as Response).status).toBe(400);
    expect(await (resultat as Response).text()).toContain("100");
  });

  it("refuse une facture forgee par un commercial", async () => {
    const formulaire = new FormData();
    formulaire.append("documents", "bl");
    formulaire.append("documents", "facture");

    const resultat = validerTypesDocuments(formulaire, "commercial");

    expect(resultat).toBeInstanceOf(Response);
    expect((resultat as Response).status).toBe(403);
  });

  it("refuse aussi une facture forgee sans autre document autorise", () => {
    const formulaire = new FormData();
    formulaire.append("documents", "facture");

    const resultat = validerTypesDocuments(formulaire, "commercial");

    expect(resultat).toBeInstanceOf(Response);
    expect((resultat as Response).status).toBe(403);
  });

  it("accepte les trois documents pour un administrateur", () => {
    const formulaire = new FormData();
    formulaire.append("documents", "bl");
    formulaire.append("documents", "facture");
    formulaire.append("documents", "bon_charge");

    expect(validerTypesDocuments(formulaire, "admin")).toEqual([
      "bl",
      "facture",
      "bon_charge",
    ]);
  });
});
