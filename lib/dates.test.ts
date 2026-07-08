import { describe, expect, it } from "vitest";
import { bornesJourneeInclusive } from "@/lib/dates";

describe("dates", () => {
  it("produit une borne de fin exclusive au lendemain local", () => {
    const bornes = bornesJourneeInclusive("2026-07-08", "2026-07-08");

    expect(bornes.debutUtc.toISOString()).toBe("2026-07-07T23:00:00.000Z");
    expect(bornes.finExclusiveUtc.toISOString()).toBe("2026-07-08T23:00:00.000Z");
  });

  it("rejette une période inversée", () => {
    expect(() => bornesJourneeInclusive("2026-07-09", "2026-07-08")).toThrow("date de fin");
  });
});
