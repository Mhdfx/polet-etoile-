import { beforeEach, describe, expect, it, vi } from "vitest";

const { produitFindManyMock, parametreFindManyMock } = vi.hoisted(() => ({
  produitFindManyMock: vi.fn(),
  parametreFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    produit: { findMany: produitFindManyMock },
    parametreSysteme: { findMany: parametreFindManyMock },
  },
}));

vi.mock("@/app/commandes/document-data", () => ({
  chargerLogoDataUri: vi.fn(async () => undefined),
  chargerCachetDataUri: vi.fn(async () => undefined),
  chargerTamponAgrementDataUri: vi.fn(async () => undefined),
}));

import { chargerTarifsDocument } from "./tarifs-data";

beforeEach(() => {
  vi.clearAllMocks();
  parametreFindManyMock.mockResolvedValue([]);
});

describe("chargerTarifsDocument", () => {
  it("trie les articles alphabetiquement sans tenir compte de la casse", async () => {
    produitFindManyMock.mockResolvedValue([
      { nom: "SAUCISSES NATURE", prix_reference: "35" },
      { nom: "KEFTA EPICE", prix_reference: "34" },
      { nom: "Ailes", prix_reference: "15" },
      { nom: "Abats de poulet", prix_reference: "23" },
    ]);

    const data = await chargerTarifsDocument();

    expect(data.produits.map((produit) => produit.nom)).toEqual([
      "Abats de poulet",
      "Ailes",
      "KEFTA EPICE",
      "SAUCISSES NATURE",
    ]);
  });
});
