import { describe, expect, it, vi } from "vitest";
import { attribuerNumeroFacture, formaterNumeroFacture } from "@/lib/facture";

describe("facture", () => {
  it("formate une sequence independante", () => {
    expect(formaterNumeroFacture(42, "FAC")).toBe("FAC-000042");
    expect(formaterNumeroFacture(1)).toBe("FACT-000001");
  });

  it("verrouille le compteur facture avant attribution", async () => {
    const tx = {
      compteurBl: { upsert: vi.fn(), update: vi.fn() },
      parametreSysteme: {
        findUnique: vi.fn().mockResolvedValue({ valeur: "FACT" }),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ valeur: 7 }]),
    };

    await expect(attribuerNumeroFacture(tx as never)).resolves.toEqual({
      compteur: 8,
      numeroFacture: "FACT-000008",
    });
    expect(String(tx.$queryRaw.mock.calls[0][0])).toContain("FOR UPDATE");
    expect(tx.compteurBl.update).toHaveBeenCalledWith({
      where: { cle: "numero_facture" },
      data: { valeur: 8 },
    });
  });
});
