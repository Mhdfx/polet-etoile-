import { describe, expect, it } from "vitest";
import { construireLignesPiedSociete } from "./pied-societe";

describe("construireLignesPiedSociete", () => {
  it("reproduit les deux lignes legales demandees par le client", () => {
    expect(
      construireLignesPiedSociete({
        raisonSociale: "COQ PLUS SARL",
        adresse: "RDC 1 LOT EL FARAH MOHAMMEDIA",
        rc: "39869 MOHAMMEDIA",
        ice: "003931636000009",
        identifiantFiscal: "72064177",
        patente: "39504226",
        telephone: "+212 660924488",
      }),
    ).toEqual({
      principale: "COQ PLUS SARL, Siège social : RDC 1 LOT EL FARAH MOHAMMEDIA",
      secondaire:
        "RC : 39869 MOHAMMEDIA - ICE : 003931636000009 - IF : 72064177 - TP : 39504226 - Tél : +212 660924488",
    });
  });

  it("n'affiche pas de libelle vide lorsqu'une mention manque", () => {
    expect(
      construireLignesPiedSociete({
        raisonSociale: "COQ PLUS SARL",
        telephone: "+212 660924488",
      }),
    ).toEqual({
      principale: "COQ PLUS SARL",
      secondaire: "Tél : +212 660924488",
    });
  });
});
