import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, txMock, transactionMock, revalidatePathMock } =
  vi.hoisted(() => {
    const txMock = {
      produit: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      historiquePrix: { create: vi.fn() },
      ligneCommande: { update: vi.fn(), updateMany: vi.fn() },
      auditLog: { create: vi.fn() },
      $queryRaw: vi.fn(),
    };

    return {
      txMock,
      requireAdminMock: vi.fn(),
      transactionMock: vi.fn(
        async (callback: (tx: typeof txMock) => Promise<unknown>) =>
          callback(txMock),
      ),
      revalidatePathMock: vi.fn(),
    };
  });

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("@/lib/session", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transactionMock } }));

import {
  changerPrixEnMasse,
  changerPrixProduit,
  creerProduit,
  supprimerProduit,
} from "./actions";

const admin = {
  id: "admin-1",
  nom_utilisateur: "admin",
  nom_complet: "Administrateur",
  email: "admin@test.local",
  role: "ADMIN",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(admin);
});

describe("creerProduit", () => {
  it("verifie la permission admin avant tout", async () => {
    requireAdminMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerProduit({})).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("retourne des erreurs de champ en francais sans toucher la base", async () => {
    const resultat = await creerProduit({ nom: "P", categorie: "", prix: "abc" });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.nom).toBe("Le nom doit contenir au moins 2 caractères");
      expect(resultat.erreurs?.categorie).toBe("La catégorie est obligatoire");
      expect(resultat.erreurs?.prix).toContain("supérieur à 0");
    }
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("refuse un doublon de nom actif (garantie anti double-soumission)", async () => {
    txMock.produit.findFirst.mockResolvedValue({ id: "prod-existant" });

    const resultat = await creerProduit({
      nom: "Poulet entier",
      categorie: "Volaille",
      prix: "45,50",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.nom).toBe("Un produit actif porte déjà ce nom");
    }
    expect(txMock.produit.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("cree le produit avec prix normalise et ecrit l'audit dans la transaction", async () => {
    txMock.produit.findFirst.mockResolvedValue(null);
    txMock.produit.create.mockResolvedValue({ id: "prod-1" });

    const resultat = await creerProduit({
      nom: "Poulet entier",
      categorie: "Volaille",
      prix: "45,50",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.produit.create).toHaveBeenCalledWith({
      data: { nom: "Poulet entier", categorie: "Volaille", prix_reference: "45.50" },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "produit.creation",
          entite: "produits",
          utilisateur_id: "admin-1",
          ip_address: "10.0.0.1",
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/produits");
  });
});

describe("changerPrixProduit", () => {
  it("verrouille la ligne, ecrit l'historique et ne touche jamais aux lignes de commande", async () => {
    txMock.$queryRaw.mockResolvedValue([{ prix_reference: "23.50" }]);

    const resultat = await changerPrixProduit({ id: "prod-1", nouveauPrix: "28,90" });

    expect(resultat.ok).toBe(true);
    expect(txMock.produit.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { prix_reference: "28.90" },
    });
    expect(txMock.historiquePrix.create).toHaveBeenCalledWith({
      data: {
        produit_id: "prod-1",
        ancien_prix: "23.50",
        nouveau_prix: "28.90",
        utilisateur_id: "admin-1",
      },
    });
    // Regle CDC : le changement de prix ne modifie JAMAIS les commandes passees.
    expect(txMock.ligneCommande.update).not.toHaveBeenCalled();
    expect(txMock.ligneCommande.updateMany).not.toHaveBeenCalled();
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "produit.changement_prix" }),
      }),
    );
  });

  it("retourne une erreur si le produit est introuvable ou supprime", async () => {
    txMock.$queryRaw.mockResolvedValue([]);

    const resultat = await changerPrixProduit({ id: "prod-x", nouveauPrix: "28,90" });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toBe("Produit introuvable");
    }
    expect(txMock.produit.update).not.toHaveBeenCalled();
    expect(txMock.historiquePrix.create).not.toHaveBeenCalled();
  });
});

describe("changerPrixEnMasse", () => {
  it("applique tous les changements et saute les prix identiques", async () => {
    txMock.$queryRaw
      .mockResolvedValueOnce([{ prix_reference: "23.50" }])
      .mockResolvedValueOnce([{ prix_reference: "30.00" }]);

    const resultat = await changerPrixEnMasse({
      lignes: [
        { id: "prod-1", nouveauPrix: "25,00" },
        { id: "prod-2", nouveauPrix: "30,00" },
      ],
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.produit.update).toHaveBeenCalledTimes(1);
    expect(txMock.produit.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { prix_reference: "25.00" },
    });
    expect(txMock.historiquePrix.create).toHaveBeenCalledTimes(1);
  });

  it("annule tout le lot si un produit est introuvable (tout ou rien)", async () => {
    txMock.$queryRaw
      .mockResolvedValueOnce([{ prix_reference: "23.50" }])
      .mockResolvedValueOnce([]);

    const resultat = await changerPrixEnMasse({
      lignes: [
        { id: "prod-1", nouveauPrix: "25,00" },
        { id: "prod-disparu", nouveauPrix: "30,00" },
      ],
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("aucun prix n'a été modifié");
    }
  });

  it("cle d'erreur par produit pour un prix invalide", async () => {
    const resultat = await changerPrixEnMasse({
      lignes: [{ id: "prod-1", nouveauPrix: "abc" }],
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.["prix_prod-1"]).toContain("supérieur à 0");
    }
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("refuse un lot vide", async () => {
    const resultat = await changerPrixEnMasse({ lignes: [] });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toBe("Aucun changement de prix à appliquer");
    }
  });
});

describe("supprimerProduit", () => {
  it("fait une suppression logique tracee, jamais un DELETE", async () => {
    txMock.produit.findFirst.mockResolvedValue({
      nom: "Poulet entier",
      categorie: "Volaille",
      actif: true,
    });

    const resultat = await supprimerProduit("prod-1");

    expect(resultat.ok).toBe(true);
    expect(txMock.produit.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { deleted_at: expect.any(Date), actif: false },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "produit.suppression" }),
      }),
    );
  });

  it("retourne un message generique avec reference en cas d'erreur serveur", async () => {
    txMock.produit.findFirst.mockRejectedValue(new Error("panne mysql"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultat = await supprimerProduit("prod-1");

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("Une erreur est survenue");
      expect(resultat.message).not.toContain("panne mysql");
    }
    consoleSpy.mockRestore();
  });
});
