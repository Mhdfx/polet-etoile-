import { describe, expect, it } from "vitest";
import { formatDate, formatMontant } from "@/lib/format";

describe("format", () => {
  it("formate les montants en DH avec virgule décimale", () => {
    expect(formatMontant("60037")).toBe("60 037,00 DH");
  });

  it("formate les dates en jour/mois/année", () => {
    expect(formatDate("2026-07-08T12:00:00.000Z")).toBe("08/07/2026");
  });
});
