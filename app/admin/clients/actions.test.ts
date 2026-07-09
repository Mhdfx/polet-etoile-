import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, txMock, transactionMock, revalidatePathMock } =
  vi.hoisted(() => {
    const txMock = {
      user: { findFirst: vi.fn() },
      client: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      clientExterne: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };

    return {
      txMock,
      requireAdminMock: vi.fn(),
      revalidatePathMock: vi.fn(),
      transactionMock: vi.fn(
        async (callback: (tx: typeof txMock) => Promise<unknown>) =>
          callback(txMock),
      ),
    };
  });

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("@/lib/session", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transactionMock } }));

import {
  creerClientAdmin,
  creerClientExterne,
  supprimerClientAdmin,
  supprimerClientExterne,
} from "./actions";

const admin = { id: "admin-1", role: "ADMIN" };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(admin);
});

describe("clients admin", () => {
  it("exige un administrateur avant toute mutation", async () => {
    requireAdminMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerClientAdmin({})).rejects.toThrow("NEXT_REDIRECT:/403");
    await expect(creerClientExterne({})).rejects.toThrow("NEXT_REDIRECT:/403");
    await expect(supprimerClientAdmin("client-1")).rejects.toThrow(
      "NEXT_REDIRECT:/403",
    );
    await expect(supprimerClientExterne("ext-1")).rejects.toThrow(
      "NEXT_REDIRECT:/403",
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("valide les champs en francais sans toucher la base", async () => {
    const resultat = await creerClientAdmin({
      nom: "A",
      regionVille: "",
      commercialId: "",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.nom).toContain("au moins 2 caracteres");
      expect(resultat.erreurs?.regionVille).toBe("La ville est obligatoire");
      expect(resultat.erreurs?.commercialId).toBe("Identifiant introuvable");
    }
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("refuse un commercial inactif ou inexistant", async () => {
    txMock.user.findFirst.mockResolvedValue(null);

    const resultat = await creerClientAdmin({
      nom: "Boucherie Atlas",
      regionVille: "Casablanca",
      commercialId: "com-1",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.commercialId).toBe("Commercial introuvable");
    }
    expect(txMock.client.create).not.toHaveBeenCalled();
  });

  it("cree un client standard avec commercial et audit", async () => {
    txMock.user.findFirst.mockResolvedValue({ id: "com-1" });
    txMock.client.findFirst.mockResolvedValue(null);
    txMock.client.create.mockResolvedValue({ id: "client-1" });

    const resultat = await creerClientAdmin({
      nom: "Boucherie Atlas",
      regionVille: "Casablanca",
      telephone: "06 00 00 00 00",
      commercialId: "com-1",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.client.create).toHaveBeenCalledWith({
      data: {
        nom: "Boucherie Atlas",
        region_ville: "Casablanca",
        telephone: "06 00 00 00 00",
        commercial_id: "com-1",
      },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.creation",
          entite: "clients",
          utilisateur_id: "admin-1",
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients");
  });

  it("soft delete un client externe et audite l'action", async () => {
    txMock.clientExterne.findFirst.mockResolvedValue({
      nom: "Traiteur Centre",
      region_ville: "Rabat",
      telephone: null,
    });

    const resultat = await supprimerClientExterne("ext-1");

    expect(resultat.ok).toBe(true);
    expect(txMock.clientExterne.update).toHaveBeenCalledWith({
      where: { id: "ext-1" },
      data: { actif: false, deleted_at: expect.any(Date) },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "client_externe.suppression" }),
      }),
    );
  });
});
