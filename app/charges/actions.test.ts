import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, txMock, transactionMock } = vi.hoisted(() => {
  const txMock = {
    user: { findFirst: vi.fn() },
    produit: { findMany: vi.fn() },
    compteurBl: { upsert: vi.fn(), update: vi.fn() },
    parametreSysteme: { findUnique: vi.fn() },
    bonCharge: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn(),
  };

  return {
    txMock,
    requireAdminMock: vi.fn(),
    transactionMock: vi.fn(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    ),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("@/lib/session", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transactionMock } }));

import { creerBonCharge } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  txMock.user.findFirst.mockResolvedValue({ id: "com-1" });
  txMock.produit.findMany.mockResolvedValue([{ id: "prod-1" }, { id: "prod-2" }]);
  txMock.compteurBl.upsert.mockResolvedValue(undefined);
  txMock.$queryRaw.mockResolvedValue([{ valeur: 4 }]);
  txMock.compteurBl.update.mockResolvedValue(undefined);
  txMock.parametreSysteme.findUnique.mockResolvedValue({ valeur: "BC" });
  txMock.bonCharge.create.mockResolvedValue({ id: "bc-1" });
});

describe("creerBonCharge", () => {
  it("exige un admin (permission serveur, pas seulement UI)", async () => {
    requireAdminMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerBonCharge({})).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("valide commercial et au moins une ligne", async () => {
    const resultat = await creerBonCharge({ commercialId: "", lignes: [] });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.commercialId).toBeDefined();
      expect(resultat.erreurs?.lignes).toBeDefined();
    }
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("attribue un numero via le compteur verrouille et audite", async () => {
    const resultat = await creerBonCharge({
      commercialId: "com-1",
      lignes: [
        { produitId: "prod-1", quantite: "12,5" },
        { produitId: "prod-2", quantite: "3" },
      ],
    });

    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(resultat.numeroBc).toBe("BC-000005");
    }
    // Compteur lu en FOR UPDATE dans la transaction.
    expect(txMock.$queryRaw).toHaveBeenCalled();
    expect(txMock.bonCharge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numero_bc: "BC-000005",
          numero_bc_compteur: 5,
          commercial_id: "com-1",
          cree_par: "admin-1",
        }),
      }),
    );
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "bon_charge.creation" }),
      }),
    );
  });

  it("refuse un produit non suivi en stock (introuvable dans l'ensemble autorise)", async () => {
    txMock.produit.findMany.mockResolvedValue([{ id: "prod-1" }]); // prod-2 exclu

    const resultat = await creerBonCharge({
      commercialId: "com-1",
      lignes: [
        { produitId: "prod-1", quantite: "5" },
        { produitId: "prod-2", quantite: "5" },
      ],
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("non suivi en stock");
    }
    expect(txMock.bonCharge.create).not.toHaveBeenCalled();
  });
});
