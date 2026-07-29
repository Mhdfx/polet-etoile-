import { describe, expect, it } from "vitest";
import { remplirWorkbookCommandes } from "./excel-commandes";

const commande = {
  numero_bl: "CP-000001",
  date_commande: new Date("2026-07-28T10:00:00.000Z"),
  type_commande: "STANDARD",
  client: { nom: "Client QA" },
  client_externe: null,
  utilisateur: { nom_complet: "Commercial QA" },
  lignes: [{ prix_net: "1234.56" }, { prix_net: "0.44" }],
  paiements: [{ montant: "200.00" }],
};

describe("remplirWorkbookCommandes", () => {
  it("ecrit les montants admin comme nombres Excel avec format DH", () => {
    const workbook = remplirWorkbookCommandes({
      commandes: [commande],
      statut: undefined,
      portee: "admin",
    });
    const feuille = workbook.getWorksheet("Commandes");

    expect(feuille).toBeDefined();
    expect(feuille?.getCell("F2").value).toBe(1235);
    expect(feuille?.getCell("G2").value).toBe(200);
    expect(feuille?.getCell("H2").value).toBe(1035);
    expect(feuille?.getCell("F2").numFmt).toBe('#,##0.00 "DH"');
  });

  it("respecte le filtre de statut et les colonnes commerciales", () => {
    const workbook = remplirWorkbookCommandes({
      commandes: [commande],
      statut: "paye",
      portee: "commercial",
    });
    const feuille = workbook.getWorksheet("Mes commandes");

    expect(feuille?.rowCount).toBe(1);
    expect(feuille?.getRow(1).values).toEqual([
      undefined,
      "Numero BL",
      "Date",
      "Client",
      "Total",
      "Paye",
      "Reste",
      "Statut",
    ]);
  });
});
