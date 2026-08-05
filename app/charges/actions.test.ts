import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, txMock, transactionMock } = vi.hoisted(() => {
  const txMock = {
    user: { findFirst: vi.fn() },
    produit: { findMany: vi.fn() },
    compteurBl: { upsert: vi.fn(), update: vi.fn() },
    parametreSysteme: { findUnique: vi.fn() },
    bonCharge: { create: vi.fn(), update: vi.fn() },
    ligneBonCharge: { updateMany: vi.fn() },
    commande: { findFirst: vi.fn() },
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

import { creerBonCharge, creerBonChargeDepuisCommande } from "./actions";
import { assurerBonChargeDepuisCommande } from "./bon-charge-depuis-commande";

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
  txMock.bonCharge.update.mockResolvedValue({ id: "bc-1" });
  txMock.ligneBonCharge.updateMany.mockResolvedValue({ count: 0 });
  txMock.commande.findFirst.mockResolvedValue({
    id: "commande-1",
    numero_bl: "CP-000123",
    utilisateur_id: "com-1",
    date_commande: new Date("2026-07-11T12:00:00.000Z"),
    bon_charge: null,
    lignes: [
      {
        produit_id: "prod-1",
        quantite: { toFixed: () => "10.000" },
        produit: { id: "prod-1", suivi_stock: true },
      },
      {
        produit_id: "reliquat",
        quantite: { toFixed: () => "1.000" },
        produit: { id: "reliquat", suivi_stock: false },
      },
    ],
  });
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

describe("creerBonChargeDepuisCommande", () => {
  it("genere un bon de charge lie a la commande avec ses lignes stock", async () => {
    const resultat = await creerBonChargeDepuisCommande("commande-1");

    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(resultat.numeroBc).toBe("BC-000005");
    }
    expect(txMock.commande.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "commande-1", deleted_at: null },
      }),
    );
    expect(txMock.bonCharge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commande_id: "commande-1",
          commercial_id: "com-1",
          commentaire: "Genere depuis la commande CP-000123",
          lignes: {
            create: [{ produit_id: "prod-1", quantite_kg: "10.000" }],
          },
        }),
      }),
    );
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "bon_charge.creation_depuis_commande",
        }),
      }),
    );
  });

  it("verifie le proprietaire lors de la generation commerciale a la demande", async () => {
    const resultat = await assurerBonChargeDepuisCommande(txMock as never, {
      commandeId: "commande-1",
      acteurId: "com-1",
      commercialIdAttendu: "com-1",
      ip: "10.0.0.1",
      actionAudit: "bon_charge.creation_automatique_commercial",
    });

    expect(resultat.statut).toBe("cree");
    expect(txMock.commande.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "commande-1",
          deleted_at: null,
          utilisateur_id: "com-1",
        },
      }),
    );
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          utilisateur_id: "com-1",
          action: "bon_charge.creation_automatique_commercial",
        }),
      }),
    );
  });

  it("ne genere jamais le bon d'une commande hors portefeuille", async () => {
    txMock.commande.findFirst.mockResolvedValue(null);

    const resultat = await assurerBonChargeDepuisCommande(txMock as never, {
      commandeId: "commande-autre-commercial",
      acteurId: "com-1",
      commercialIdAttendu: "com-1",
      ip: null,
    });

    expect(resultat).toEqual({
      statut: "introuvable",
      message: "Commande introuvable",
    });
    expect(txMock.bonCharge.create).not.toHaveBeenCalled();
    expect(txMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuse de generer un deuxieme bon de charge pour la meme commande", async () => {
    txMock.commande.findFirst.mockResolvedValue({
      id: "commande-1",
      numero_bl: "CP-000123",
      utilisateur_id: "com-1",
      date_commande: new Date("2026-07-11T12:00:00.000Z"),
      bon_charge: { id: "bc-1", numero_bc: "BC-000005", deleted_at: null },
      lignes: [],
    });

    const resultat = await creerBonChargeDepuisCommande("commande-1");

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("existe deja");
    }
    expect(txMock.bonCharge.create).not.toHaveBeenCalled();
  });

  it("permet a l'admin de regenerer un BC supprime avec un nouveau numero et les lignes actualisees", async () => {
    txMock.commande.findFirst.mockResolvedValue({
      id: "commande-1",
      numero_bl: "CP-000123",
      utilisateur_id: "com-1",
      date_commande: new Date("2026-07-11T12:00:00.000Z"),
      bon_charge: {
        id: "bc-1",
        numero_bc: "BC-000003",
        deleted_at: new Date("2026-08-04T10:00:00.000Z"),
      },
      lignes: [
        {
          produit_id: "prod-1",
          quantite: { toFixed: () => "25.000" },
          produit: { id: "prod-1", suivi_stock: true },
        },
      ],
    });

    const resultat = await creerBonChargeDepuisCommande("commande-1");

    expect(resultat).toEqual({
      ok: true,
      bonChargeId: "bc-1",
      numeroBc: "BC-000005",
    });
    expect(txMock.bonCharge.create).not.toHaveBeenCalled();
    expect(txMock.bonCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bc-1" },
        data: expect.objectContaining({
          numero_bc: "BC-000005",
          numero_bc_compteur: 5,
          deleted_at: null,
          commentaire: "Regenere depuis la commande CP-000123",
          lignes: {
            create: [{ produit_id: "prod-1", quantite_kg: "25.000" }],
          },
        }),
      }),
    );
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "bon_charge.regeneration_depuis_commande",
        }),
      }),
    );
  });

  it("interdit au commercial de regenerer un BC supprime", async () => {
    txMock.commande.findFirst.mockResolvedValue({
      id: "commande-1",
      numero_bl: "CP-000123",
      utilisateur_id: "com-1",
      date_commande: new Date("2026-07-11T12:00:00.000Z"),
      bon_charge: {
        id: "bc-1",
        numero_bc: "BC-000003",
        deleted_at: new Date("2026-08-04T10:00:00.000Z"),
      },
      lignes: [],
    });

    const resultat = await assurerBonChargeDepuisCommande(txMock as never, {
      commandeId: "commande-1",
      acteurId: "com-1",
      commercialIdAttendu: "com-1",
      ip: null,
    });

    expect(resultat.statut).toBe("supprime");
    expect(txMock.bonCharge.update).not.toHaveBeenCalled();
    expect(txMock.bonCharge.create).not.toHaveBeenCalled();
  });
});
