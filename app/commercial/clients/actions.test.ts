import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCommercialMock, txMock, transactionMock, redirectMock } =
  vi.hoisted(() => {
    const txMock = {
      client: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };

    return {
      txMock,
      requireCommercialMock: vi.fn(),
      redirectMock: vi.fn((path: string) => {
        throw new Error(`NEXT_REDIRECT:${path}`);
      }),
      transactionMock: vi.fn(
        async (callback: (tx: typeof txMock) => Promise<unknown>) =>
          callback(txMock),
      ),
    };
  });

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("@/lib/session", () => ({ requireCommercial: requireCommercialMock }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transactionMock } }));

import {
  creerClientCommercial,
  modifierClientCommercial,
  supprimerClientCommercial,
} from "./actions";

const commercial = { id: "com-1", role: "COMMERCIAL" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCommercialMock.mockResolvedValue(commercial);
});

describe("clients commercial", () => {
  it("exige un commercial avant toute mutation", async () => {
    requireCommercialMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerClientCommercial({})).rejects.toThrow("NEXT_REDIRECT:/403");
    await expect(modifierClientCommercial({})).rejects.toThrow(
      "NEXT_REDIRECT:/403",
    );
    await expect(supprimerClientCommercial("client-1")).rejects.toThrow(
      "NEXT_REDIRECT:/403",
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("cree un client rattache au commercial connecte", async () => {
    txMock.client.findFirst.mockResolvedValue(null);
    txMock.client.create.mockResolvedValue({ id: "client-1" });

    const resultat = await creerClientCommercial({
      nom: "Boucherie Atlas",
      regionVille: "Casablanca",
      adresse: "Rue 1 Casablanca",
      telephone: "06 00 00 00 00",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.client.create).toHaveBeenCalledWith({
      data: {
        nom: "Boucherie Atlas",
        region_ville: "Casablanca",
        adresse: "Rue 1 Casablanca",
        telephone: "06 00 00 00 00",
        commercial_id: "com-1",
      },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.creation",
          utilisateur_id: "com-1",
        }),
      }),
    );
  });

  it("refuse le doublon dans le portefeuille du commercial", async () => {
    txMock.client.findFirst.mockResolvedValue({ id: "client-existant" });

    const resultat = await creerClientCommercial({
      nom: "Boucherie Atlas",
      regionVille: "Casablanca",
      adresse: "Rue 1 Casablanca",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.nom).toContain("deja un client actif");
    }
    expect(txMock.client.create).not.toHaveBeenCalled();
  });

  it("redirige en 403 si un commercial modifie le client d'un autre", async () => {
    txMock.client.findFirst.mockResolvedValue({
      nom: "Client Sud",
      region_ville: "Rabat",
      adresse: "Avenue Rabat",
      telephone: null,
      commercial_id: "com-2",
      actif: true,
    });

    await expect(
      modifierClientCommercial({
        id: "client-autre",
        nom: "Client Sud",
        regionVille: "Rabat",
        adresse: "Avenue Rabat",
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/403");

    expect(redirectMock).toHaveBeenCalledWith("/403");
    expect(txMock.client.update).not.toHaveBeenCalled();
  });

  it("soft delete uniquement un client du commercial connecte", async () => {
    txMock.client.findFirst.mockResolvedValue({
      nom: "Boucherie Atlas",
      region_ville: "Casablanca",
      adresse: "Rue 1 Casablanca",
      telephone: "06",
      commercial_id: "com-1",
    });

    const resultat = await supprimerClientCommercial("client-1");

    expect(resultat.ok).toBe(true);
    expect(txMock.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { actif: false, deleted_at: expect.any(Date) },
    });
  });
});
