import { describe, expect, it } from "vitest";
import {
  noteExclusions,
  preparerConsolide,
  type CommandeSelectionnee,
} from "./documents-bulk-selection";

const commandes: CommandeSelectionnee[] = [
  {
    id: "commande-avec-bon",
    numero_bl: "CP-000001",
    bon_charge: { id: "bon-1", numero_bc: "BC-000001" },
  },
  {
    id: "commande-sans-bon",
    numero_bl: "CP-000002",
    bon_charge: null,
  },
  {
    id: "commande-deja-telechargee",
    numero_bl: "CP-000003",
    bon_charge: { id: "bon-3", numero_bc: "BC-000003" },
  },
];

describe("preparerConsolide", () => {
  it("exclut toujours les commandes sans bon de charge", () => {
    const resultat = preparerConsolide({
      commandes,
      portee: "admin",
      bonsDeChargeDejaTelecharges: new Set(),
    });

    expect(resultat.inclues.map((commande) => commande.id)).toEqual([
      "commande-avec-bon",
      "commande-deja-telechargee",
    ]);
    expect(resultat.exclues).toContainEqual({
      numeroBl: "CP-000002",
      raison: "absent",
    });
    expect(resultat.bonsChargeInclus).toEqual([]);
  });

  it("verrouille seulement les bons effectivement livres au commercial", () => {
    const resultat = preparerConsolide({
      commandes,
      portee: "commercial",
      bonsDeChargeDejaTelecharges: new Set(["bon-3"]),
    });

    expect(resultat.inclues.map((commande) => commande.id)).toEqual([
      "commande-avec-bon",
    ]);
    expect(resultat.bonsChargeInclus).toEqual([
      { commandeId: "commande-avec-bon", bonChargeId: "bon-1" },
    ]);
    expect(resultat.exclues).toEqual([
      { numeroBl: "CP-000002", raison: "absent" },
      {
        numeroBl: "CP-000003",
        numeroBc: "BC-000003",
        raison: "deja_telecharge",
      },
    ]);
  });

  it("explique separement les absences et les telechargements deja consommes", () => {
    const note = noteExclusions([
      { numeroBl: "CP-000002", raison: "absent" },
      {
        numeroBl: "CP-000003",
        numeroBc: "BC-000003",
        raison: "deja_telecharge",
      },
    ]);

    expect(note).toContain("CP-000002");
    expect(note).toContain("sans bon de charge");
    expect(note).toContain("CP-000003 (BC-000003)");
    expect(note).toContain("deja ete telecharge");
  });
});
