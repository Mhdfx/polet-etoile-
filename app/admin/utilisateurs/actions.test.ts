import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, txMock, transactionMock, hashPasswordMock } =
  vi.hoisted(() => {
    const txMock = {
      user: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      account: { create: vi.fn(), upsert: vi.fn() },
      session: { deleteMany: vi.fn() },
      objectif: { findUnique: vi.fn(), upsert: vi.fn() },
      auditLog: { create: vi.fn() },
    };

    return {
      txMock,
      requireAdminMock: vi.fn(),
      transactionMock: vi.fn(
        async (callback: (tx: typeof txMock) => Promise<unknown>) =>
          callback(txMock),
      ),
      hashPasswordMock: vi.fn(async () => "mot-de-passe-hache"),
    };
  });

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("better-auth/crypto", () => ({ hashPassword: hashPasswordMock }));
vi.mock("@/lib/session", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transactionMock } }));

import {
  creerUtilisateur,
  definirActivationUtilisateur,
  definirObjectif,
  reinitialiserMotDePasse,
  supprimerUtilisateur,
} from "./actions";

const admin = { id: "admin-1", role: "ADMIN" };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(admin);
  hashPasswordMock.mockResolvedValue("mot-de-passe-hache");
});

describe("restriction de role", () => {
  it("chaque action exige un admin (redirection sinon)", async () => {
    requireAdminMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerUtilisateur({})).rejects.toThrow("NEXT_REDIRECT:/403");
    await expect(reinitialiserMotDePasse({})).rejects.toThrow("NEXT_REDIRECT:/403");
    await expect(definirActivationUtilisateur("u", false)).rejects.toThrow(
      "NEXT_REDIRECT:/403",
    );
    await expect(supprimerUtilisateur("u")).rejects.toThrow("NEXT_REDIRECT:/403");
    await expect(definirObjectif({})).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("creerUtilisateur", () => {
  it("valide la saisie en francais", async () => {
    const resultat = await creerUtilisateur({
      nomComplet: "Y",
      nomUtilisateur: "AB",
      role: "AUTRE",
      motDePasse: "court",
      confirmation: "autre",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.nomComplet).toContain("au moins 2 caractères");
      expect(resultat.erreurs?.nomUtilisateur).toContain("3 à 50 caractères");
      expect(resultat.erreurs?.role).toContain("Administrateur ou Commercial");
      expect(resultat.erreurs?.motDePasse).toContain("au moins 12 caractères");
    }
  });

  it("refuse une confirmation differente", async () => {
    const resultat = await creerUtilisateur({
      nomComplet: "Yassine Alaoui",
      nomUtilisateur: "commercial.centre",
      role: "COMMERCIAL",
      motDePasse: "motdepasse123",
      confirmation: "autrechose",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.confirmation).toBe(
        "La confirmation ne correspond pas au mot de passe",
      );
    }
  });

  it("refuse un nom d'utilisateur deja pris (meme soft-delete)", async () => {
    txMock.user.findFirst.mockResolvedValue({ id: "existant" });

    const resultat = await creerUtilisateur({
      nomComplet: "Yassine Alaoui",
      nomUtilisateur: "commercial.nord",
      role: "COMMERCIAL",
      motDePasse: "motdepasse123",
      confirmation: "motdepasse123",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.nomUtilisateur).toContain("déjà pris");
    }
    expect(txMock.user.create).not.toHaveBeenCalled();
  });

  it("cree user + compte credential hache, audit sans mot de passe", async () => {
    txMock.user.findFirst.mockResolvedValue(null);
    txMock.user.create.mockResolvedValue({ id: "user-neuf" });

    const resultat = await creerUtilisateur({
      nomComplet: "Yassine Alaoui",
      nomUtilisateur: "Commercial.Centre",
      role: "COMMERCIAL",
      motDePasse: "motdepasse123",
      confirmation: "motdepasse123",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.user.create).toHaveBeenCalledWith({
      data: {
        nom_utilisateur: "commercial.centre",
        nom_complet: "Yassine Alaoui",
        email: "commercial.centre@poulet-etoile.local",
        email_verifie: true,
        role: "COMMERCIAL",
      },
    });
    expect(txMock.account.create).toHaveBeenCalledWith({
      data: {
        providerId: "credential",
        accountId: "user-neuf",
        userId: "user-neuf",
        password: "mot-de-passe-hache",
      },
    });

    const audit = txMock.auditLog.create.mock.calls[0][0];
    expect(JSON.stringify(audit)).not.toContain("motdepasse123");
    expect(JSON.stringify(audit)).not.toContain("mot-de-passe-hache");
  });
});

describe("reinitialiserMotDePasse", () => {
  it("met a jour le hash, force la deconnexion et audite sans secret", async () => {
    txMock.user.findFirst.mockResolvedValue({ id: "user-1" });

    const resultat = await reinitialiserMotDePasse({
      id: "user-1",
      motDePasse: "nouveaumdp123",
      confirmation: "nouveaumdp123",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.account.upsert).toHaveBeenCalled();
    expect(txMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });

    const audit = txMock.auditLog.create.mock.calls[0][0];
    expect(JSON.stringify(audit)).not.toContain("nouveaumdp123");
  });
});

describe("definirActivationUtilisateur", () => {
  it("interdit de desactiver son propre compte", async () => {
    const resultat = await definirActivationUtilisateur("admin-1", false);

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("votre propre compte");
    }
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("interdit de desactiver le dernier admin actif", async () => {
    txMock.user.findFirst.mockResolvedValue({ actif: true, role: "ADMIN" });
    txMock.user.count.mockResolvedValue(0);

    const resultat = await definirActivationUtilisateur("autre-admin", false);

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("dernier administrateur");
    }
    expect(txMock.user.update).not.toHaveBeenCalled();
  });

  it("desactive un commercial et ferme ses sessions", async () => {
    txMock.user.findFirst.mockResolvedValue({ actif: true, role: "COMMERCIAL" });

    const resultat = await definirActivationUtilisateur("com-1", false);

    expect(resultat.ok).toBe(true);
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: "com-1" },
      data: { actif: false },
    });
    expect(txMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "com-1" },
    });
  });
});

describe("supprimerUtilisateur", () => {
  it("interdit de supprimer son propre compte", async () => {
    const resultat = await supprimerUtilisateur("admin-1");

    expect(resultat.ok).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("soft delete + sessions fermees + audit", async () => {
    txMock.user.findFirst.mockResolvedValue({
      nom_utilisateur: "commercial.nord",
      nom_complet: "Commercial Nord",
      role: "COMMERCIAL",
      actif: true,
    });

    const resultat = await supprimerUtilisateur("com-1");

    expect(resultat.ok).toBe(true);
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: "com-1" },
      data: { deleted_at: expect.any(Date), actif: false },
    });
    expect(txMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "com-1" },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "utilisateur.suppression" }),
      }),
    );
  });
});

describe("definirObjectif", () => {
  it("refuse un mois invalide et un montant nul", async () => {
    const resultat = await definirObjectif({
      utilisateurId: "com-1",
      mois: "2026-13",
      montant: "0",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.mois).toBe("Le mois doit être au format AAAA-MM");
      expect(resultat.erreurs?.montant).toContain("supérieur à 0");
    }
  });

  it("refuse un utilisateur qui n'est pas un commercial actif", async () => {
    txMock.user.findFirst.mockResolvedValue(null);

    const resultat = await definirObjectif({
      utilisateurId: "admin-1",
      mois: "2026-07",
      montant: "60 000,00",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toBe("Commercial introuvable");
    }
  });

  it("upsert l'objectif avec montant normalise et audite la modification", async () => {
    txMock.user.findFirst.mockResolvedValue({ id: "com-1" });
    txMock.objectif.findUnique.mockResolvedValue({ montant_objectif: "50000.00" });

    const resultat = await definirObjectif({
      utilisateurId: "com-1",
      mois: "2026-08",
      montant: "60 000,00",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.objectif.upsert).toHaveBeenCalledWith({
      where: {
        utilisateur_id_mois: { utilisateur_id: "com-1", mois: "2026-08" },
      },
      create: {
        utilisateur_id: "com-1",
        mois: "2026-08",
        montant_objectif: "60000.00",
        created_by: "admin-1",
      },
      update: { montant_objectif: "60000.00", created_by: "admin-1" },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "objectif.modification" }),
      }),
    );
  });
});
