import { describe, expect, it, vi } from "vitest";
import { attribuerNumeroBL, formaterNumeroBl } from "@/lib/bl";

describe("bl", () => {
  it("formate un numero BL avec prefixe et padding", () => {
    expect(formaterNumeroBl(42, "PE")).toBe("PE-000042");
  });

  it("utilise le prefixe par defaut", () => {
    expect(formaterNumeroBl(1)).toBe("BL-000001");
  });

  it("attribue le prochain numero via le compteur verrouille", async () => {
    const tx = {
      compteurBl: { upsert: vi.fn(), update: vi.fn() },
      parametreSysteme: {
        findUnique: vi.fn().mockResolvedValue({ valeur: "PE" }),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ valeur: 7 }]),
    };

    const resultat = await attribuerNumeroBL(tx as never);

    expect(resultat).toEqual({ compteur: 8, numeroBl: "PE-000008" });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(String(tx.$queryRaw.mock.calls[0][0])).toContain("FOR UPDATE");
    expect(tx.compteurBl.update).toHaveBeenCalledWith({
      where: { cle: "numero_bl" },
      data: { valeur: 8 },
    });
  });
});
