import { describe, expect, it } from "vitest";

import { listerVillesMaroc, VILLES_MAROC_DEFAUT } from "@/lib/villes";

describe("liste des villes du Maroc", () => {
  it("contient Mohammedia une seule fois et conserve l'ordre alphabetique", async () => {
    const villes = await listerVillesMaroc();

    expect(VILLES_MAROC_DEFAUT).toContain("Mohammedia");
    expect(villes.filter((ville) => ville === "Mohammedia")).toHaveLength(1);
    expect(villes.indexOf("Meknes")).toBeLessThan(villes.indexOf("Mohammedia"));
    expect(villes.indexOf("Mohammedia")).toBeLessThan(villes.indexOf("Mrirt"));
  });
});
