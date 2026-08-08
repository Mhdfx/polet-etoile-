import { describe, expect, it } from "vitest";
import { construireLienPage } from "@/app/commandes/pagination";

describe("construireLienPage", () => {
  it("retire l'ancienne page pour revenir a la premiere", () => {
    expect(
      construireLienPage("/admin/commandes", { page: "2" }, 1),
    ).toBe("/admin/commandes");
  });

  it("remplace la page tout en conservant les filtres", () => {
    expect(
      construireLienPage(
        "/commercial/commandes",
        { page: "4", q: "Atlas", statut: "paye" },
        2,
      ),
    ).toBe("/commercial/commandes?q=Atlas&statut=paye&page=2");
  });
});
