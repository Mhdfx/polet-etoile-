import { describe, expect, it } from "vitest";
import { construireFiltreAudit } from "@/lib/audit-filters";

describe("construireFiltreAudit", () => {
  it("limite l'historique admin aux auteurs ADMIN", () => {
    expect(construireFiltreAudit({ roleAuteur: "ADMIN" })).toEqual({
      utilisateur: { is: { role: "ADMIN" } },
    });
  });

  it("combine le role auteur avec les filtres et la periode", () => {
    const debutUtc = new Date("2026-07-01T00:00:00.000Z");
    const finExclusiveUtc = new Date("2026-08-01T00:00:00.000Z");

    expect(
      construireFiltreAudit({
        utilisateurId: "admin-1",
        action: "suppression",
        entite: "produits",
        bornes: { debutUtc, finExclusiveUtc },
        roleAuteur: "ADMIN",
      }),
    ).toEqual({
      utilisateur_id: "admin-1",
      action: { contains: "suppression" },
      entite: { contains: "produits" },
      created_at: { gte: debutUtc, lt: finExclusiveUtc },
      utilisateur: { is: { role: "ADMIN" } },
    });
  });

  it("retourne toujours une liste vide pour une periode invalide", () => {
    expect(construireFiltreAudit({ periodeInvalide: true })).toEqual({
      id: { in: [] },
    });
  });
});
