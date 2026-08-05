import { describe, expect, it } from "vitest";
import {
  messageEchecsGenerationBonsCharge,
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
  it("inclut toutes les commandes quand plusieurs BC sont disponibles", () => {
    const multiples = Array.from({ length: 6 }, (_, index) => ({
      id: `commande-${index + 1}`,
      numero_bl: `CP-${String(index + 1).padStart(6, "0")}`,
      bon_charge: {
        id: `bon-${index + 1}`,
        numero_bc: `BC-${String(index + 1).padStart(6, "0")}`,
      },
    }));

    const resultat = preparerConsolide({
      commandes: multiples,
      portee: "admin",
      bonsDeChargeDejaTelecharges: new Set(),
    });

    expect(resultat.inclues).toHaveLength(6);
    expect(resultat.exclues).toEqual([]);
  });

  it("ne limite jamais l'admin, meme si les BC ont deja ete telecharges", () => {
    const resultat = preparerConsolide({
      commandes,
      portee: "admin",
      bonsDeChargeDejaTelecharges: new Set(["bon-1", "bon-3"]),
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

  it("nomme chaque commande quand une generation groupee est impossible", () => {
    const message = messageEchecsGenerationBonsCharge([
      { numeroBl: "CP-000040", message: "Aucun produit physique." },
      { numeroBl: "CP-000041", message: "Bon de charge supprime." },
    ]);

    expect(message).toContain("CP-000040 : Aucun produit physique.");
    expect(message).toContain("CP-000041 : Bon de charge supprime.");
  });
});
