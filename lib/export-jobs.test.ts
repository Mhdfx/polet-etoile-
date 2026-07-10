import { describe, expect, it } from "vitest";
import { peutTelechargerExport, type ExportJob } from "@/lib/export-jobs";

function job(access: "ADMIN" | "UTILISATEUR", createdBy = "user-1"): ExportJob {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    filename: "commandes.xlsx",
    filePath: "C:/exports/commandes.xlsx",
    status: "done",
    access,
    createdBy,
    createdAt: "2026-07-10T10:00:00.000Z",
    expiresAt: "2026-07-11T10:00:00.000Z",
  };
}

describe("autorisation des exports asynchrones", () => {
  it("isole un export commercial a son createur", () => {
    const exportCommercial = job("UTILISATEUR");

    expect(
      peutTelechargerExport(exportCommercial, { id: "user-1", role: "COMMERCIAL" }),
    ).toBe(true);
    expect(
      peutTelechargerExport(exportCommercial, { id: "user-2", role: "COMMERCIAL" }),
    ).toBe(false);
  });

  it("reserve les exports administratifs aux administrateurs", () => {
    const exportAdmin = job("ADMIN", "admin-1");

    expect(
      peutTelechargerExport(exportAdmin, { id: "admin-2", role: "ADMIN" }),
    ).toBe(true);
    expect(
      peutTelechargerExport(exportAdmin, { id: "user-1", role: "COMMERCIAL" }),
    ).toBe(false);
  });
});
