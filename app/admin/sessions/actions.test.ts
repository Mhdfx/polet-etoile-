import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, txMock, transactionMock } = vi.hoisted(() => {
  const txMock = {
    session: { findUnique: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
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

import { supprimerSession } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  txMock.session.findUnique.mockResolvedValue({
    id: "session-1",
    userId: "user-1",
    ipAddress: "127.0.0.1",
    user: { nom_utilisateur: "commercial.nord" },
  });
});

describe("supprimerSession", () => {
  it("exige un admin", async () => {
    requireAdminMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(supprimerSession("session-1")).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("supprime la session et audite", async () => {
    const resultat = await supprimerSession("session-1");

    expect(resultat.ok).toBe(true);
    expect(txMock.session.delete).toHaveBeenCalledWith({
      where: { id: "session-1" },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "session.suppression",
          entite: "sessions",
          utilisateur_id: "admin-1",
        }),
      }),
    );
  });

  it("masque les details d'une erreur serveur", async () => {
    txMock.session.findUnique.mockRejectedValue(new Error("panne mysql avec stack"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultat = await supprimerSession("session-1");

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("Une erreur est survenue");
      expect(resultat.message).not.toContain("panne mysql");
      expect(resultat.message).not.toContain("stack");
    }
    consoleSpy.mockRestore();
  });
});
