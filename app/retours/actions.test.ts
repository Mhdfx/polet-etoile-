import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCommercialMock, txMock, transactionMock } = vi.hoisted(() => {
  const txMock = {
    produit: { findFirst: vi.fn() },
    retour: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };

  return {
    txMock,
    requireCommercialMock: vi.fn(),
    transactionMock: vi.fn(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    ),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("@/lib/session", () => ({ requireCommercial: requireCommercialMock }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transactionMock } }));

import { creerRetour } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireCommercialMock.mockResolvedValue({ id: "com-1", role: "COMMERCIAL" });
  txMock.produit.findFirst.mockResolvedValue({ nom: "Poulet entier" });
  txMock.retour.create.mockResolvedValue({ id: "retour-1" });
});

describe("creerRetour", () => {
  it("exige un commercial", async () => {
    requireCommercialMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerRetour({})).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("valide produit et quantite", async () => {
    const resultat = await creerRetour({ produitId: "", quantiteKg: "abc" });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.produitId).toBe("Choisir un produit");
      expect(resultat.erreurs?.quantiteKg).toContain("superieure a 0");
    }
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("cree un retour non modifiable rattache au commercial et audite", async () => {
    const resultat = await creerRetour({
      produitId: "prod-1",
      quantiteKg: "2,500",
      commentaire: "Casse magasin",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.retour.create).toHaveBeenCalledWith({
      data: {
        produit_id: "prod-1",
        quantite_kg: "2.500",
        commentaire: "Casse magasin",
        utilisateur_id: "com-1",
      },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "retour.creation" }),
      }),
    );
  });
});
