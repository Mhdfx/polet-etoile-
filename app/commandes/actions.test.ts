import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminMock,
  requireCommercialMock,
  txMock,
  transactionMock,
  attribuerNumeroBLMock,
} = vi.hoisted(() => {
  const txMock = {
    user: { findFirst: vi.fn() },
    client: { findFirst: vi.fn() },
    clientExterne: { findFirst: vi.fn() },
    produit: { findMany: vi.fn() },
    commande: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    paiement: { create: vi.fn() },
    ligneCommande: { updateMany: vi.fn(), createMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn(),
  };

  return {
    txMock,
    requireAdminMock: vi.fn(),
    requireCommercialMock: vi.fn(),
    attribuerNumeroBLMock: vi.fn(),
    transactionMock: vi.fn(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    ),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("@/lib/session", () => ({
  requireAdmin: requireAdminMock,
  requireCommercial: requireCommercialMock,
}));
vi.mock("@/lib/bl", () => ({ attribuerNumeroBL: attribuerNumeroBLMock }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transactionMock } }));

import {
  ajouterPaiementCommande,
  creerCommandeAdmin,
  creerCommandeCommercial,
  genererNumeroFactureCommande,
  modifierCommandeAdmin,
  supprimerCommandeAdmin,
} from "./actions";

const admin = { id: "admin-1", role: "ADMIN" };
const commercial = { id: "com-1", role: "COMMERCIAL" };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(admin);
  requireCommercialMock.mockResolvedValue(commercial);
  attribuerNumeroBLMock.mockResolvedValue({ compteur: 9, numeroBl: "CP-000009" });
  txMock.user.findFirst.mockResolvedValue({ id: "com-1" });
  txMock.client.findFirst.mockResolvedValue({ id: "client-1" });
  txMock.clientExterne.findFirst.mockResolvedValue({ id: "ext-1" });
  txMock.produit.findMany.mockResolvedValue([
    { id: "prod-1", prix_reference: "23.50" },
    { id: "prod-2", prix_reference: "48.00" },
  ]);
  txMock.commande.create.mockResolvedValue({ id: "commande-1" });
  txMock.$queryRaw.mockResolvedValue([{ id: "commande-1" }]);
  txMock.commande.findUnique.mockResolvedValue({
    lignes: [{ prix_net: "235.00" }],
    paiements: [{ montant: "35.00" }],
  });
  txMock.commande.findFirst.mockResolvedValue({
    id: "commande-1",
    numero_bl: "CP-000009",
    utilisateur_id: "com-1",
    client_id: "client-1",
    client_externe_id: null,
    type_commande: "STANDARD",
  });
  txMock.paiement.create.mockResolvedValue({ id: "paiement-1" });
});

describe("creerCommandeCommercial", () => {
  it("exige le role commercial", async () => {
    requireCommercialMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerCommandeCommercial({})).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("cree une commande standard avec prix figes, BL transactionnel et audit", async () => {
    const resultat = await creerCommandeCommercial({
      clientId: "client-1",
      lignes: [
        { produitId: "prod-1", quantite: "10,000", prixUnitaire: "1,00" },
        { produitId: "prod-2", quantite: "2,500" },
      ],
      totalAnnonce: "355,00",
    });

    expect(resultat.ok).toBe(true);
    expect(attribuerNumeroBLMock).toHaveBeenCalledWith(txMock);
    expect(txMock.commande.create).toHaveBeenCalledWith({
      data: {
        numero_bl: "CP-000009",
        numero_bl_compteur: 9,
        utilisateur_id: "com-1",
        type_commande: "STANDARD",
        client_id: "client-1",
        client_externe_id: null,
        lignes: {
          create: [
            {
              produit_id: "prod-1",
              quantite: "10.000",
              prix_unitaire: "23.50",
              prix_net: "235.00",
            },
            {
              produit_id: "prod-2",
              quantite: "2.500",
              prix_unitaire: "48.00",
              prix_net: "120.00",
            },
          ],
        },
      },
      select: { id: true },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "commande.creation",
          entite: "commandes",
          utilisateur_id: "com-1",
        }),
      }),
    );
  });

  it("affiche une erreur claire si aucun client n'est choisi", async () => {
    const resultat = await creerCommandeCommercial({
      clientId: "",
      lignes: [{ produitId: "prod-1", quantite: "1" }],
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.clientId).toBe("Choisir un client");
    }
    expect(transactionMock).not.toHaveBeenCalled();
    expect(txMock.commande.create).not.toHaveBeenCalled();
  });

  it("permet au commercial de commander pour tout client standard actif", async () => {
    const resultat = await creerCommandeCommercial({
      clientId: "client-autre-actif",
      lignes: [{ produitId: "prod-1", quantite: "1" }],
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.client.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client-autre-actif",
        actif: true,
        deleted_at: null,
      },
      select: { id: true },
    });
    expect(txMock.commande.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          utilisateur_id: "com-1",
          client_id: "client-autre-actif",
        }),
      }),
    );
  });

  it("refuse un client standard inactif, supprime ou introuvable", async () => {
    txMock.client.findFirst.mockResolvedValue(null);

    const resultat = await creerCommandeCommercial({
      clientId: "client-autre",
      lignes: [{ produitId: "prod-1", quantite: "1" }],
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.clientId).toBe("Client introuvable");
    }
    expect(txMock.commande.create).not.toHaveBeenCalled();
  });

  it("rejette un total falsifie", async () => {
    const resultat = await creerCommandeCommercial({
      clientId: "client-1",
      lignes: [{ produitId: "prod-1", quantite: "10" }],
      totalAnnonce: "1,00",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("ne correspond pas");
    }
    expect(txMock.commande.create).not.toHaveBeenCalled();
    expect(attribuerNumeroBLMock).not.toHaveBeenCalled();
  });

  it("refuse un produit inactif ou supprime", async () => {
    txMock.produit.findMany.mockResolvedValue([]);

    const resultat = await creerCommandeCommercial({
      clientId: "client-1",
      lignes: [{ produitId: "prod-inactif", quantite: "1" }],
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain("inactif ou introuvable");
    }
    expect(txMock.commande.create).not.toHaveBeenCalled();
  });
});

describe("genererNumeroFactureCommande", () => {
  it("exige le role admin", async () => {
    requireAdminMock.mockRejectedValueOnce(new Error("NEXT_REDIRECT:/403"));

    await expect(
      genererNumeroFactureCommande({
        commandeId: "commande-1",
        numeroFacture: "FACT-INTERDIT",
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("enregistre le numero facture saisi par l'admin sous verrou", async () => {
    txMock.commande.findUnique
      .mockResolvedValueOnce({ numero_bl: "CP-000009", numero_facture: null })
      .mockResolvedValueOnce(null);

    const resultat = await genererNumeroFactureCommande({
      commandeId: "commande-1",
      numeroFacture: "FAC/2026/0042",
    });

    expect(resultat).toEqual({ ok: true, numeroFacture: "FAC/2026/0042" });
    expect(txMock.$queryRaw).toHaveBeenCalled();
    expect(txMock.commande.update).toHaveBeenCalledWith({
      where: { id: "commande-1" },
      data: {
        numero_facture: "FAC/2026/0042",
        numero_facture_compteur: null,
      },
    });
  });

  it("reutilise la facture existante sans consommer le compteur", async () => {
    txMock.commande.findUnique.mockResolvedValueOnce({
      numero_bl: "CP-000009",
      numero_facture: "FACT-000003",
    });

    const resultat = await genererNumeroFactureCommande({
      commandeId: "commande-1",
      numeroFacture: "FACT-000099",
    });

    expect(resultat).toEqual({ ok: true, numeroFacture: "FACT-000003" });
    expect(txMock.commande.update).not.toHaveBeenCalled();
  });

  it("refuse un numero facture deja utilise", async () => {
    txMock.commande.findUnique
      .mockResolvedValueOnce({ numero_bl: "CP-000009", numero_facture: null })
      .mockResolvedValueOnce({ id: "commande-autre" });

    const resultat = await genererNumeroFactureCommande({
      commandeId: "commande-1",
      numeroFacture: "FACT-DOUBLON",
    });

    expect(resultat).toEqual({
      ok: false,
      erreurs: { numeroFacture: "Ce numero de facture existe deja" },
    });
    expect(txMock.commande.update).not.toHaveBeenCalled();
  });

  it("transforme une collision concurrente en erreur de champ", async () => {
    transactionMock.mockRejectedValueOnce({ code: "P2002" });

    const resultat = await genererNumeroFactureCommande({
      commandeId: "commande-1",
      numeroFacture: "FACT-COLLISION",
    });

    expect(resultat).toEqual({
      ok: false,
      erreurs: { numeroFacture: "Ce numero de facture existe deja" },
    });
  });

  it("refuse un numero facture vide ou contenant des espaces", async () => {
    const vide = await genererNumeroFactureCommande({
      commandeId: "commande-1",
      numeroFacture: "   ",
    });
    const espaces = await genererNumeroFactureCommande({
      commandeId: "commande-1",
      numeroFacture: "FACT 0042",
    });

    expect(vide).toEqual({
      ok: false,
      erreurs: { numeroFacture: "Le numero de facture est obligatoire" },
    });
    expect(espaces).toEqual({
      ok: false,
      erreurs: {
        numeroFacture:
          "Le numero accepte uniquement lettres, chiffres, points, tirets, barres obliques et underscores",
      },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("creerCommandeAdmin", () => {
  it("exige le role admin", async () => {
    requireAdminMock.mockRejectedValue(new Error("NEXT_REDIRECT:/403"));

    await expect(creerCommandeAdmin({})).rejects.toThrow("NEXT_REDIRECT:/403");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("cree une commande externe au nom d'un commercial actif", async () => {
    const resultat = await creerCommandeAdmin({
      commercialId: "com-1",
      typeClient: "EXTERNE",
      clientExterneId: "ext-1",
      lignes: [{ produitId: "prod-1", quantite: "1", prixUnitaire: "23,50" }],
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "com-1",
        role: { in: ["ADMIN", "COMMERCIAL"] },
        actif: true,
        deleted_at: null,
      },
      select: { id: true },
    });
    expect(txMock.clientExterne.findFirst).toHaveBeenCalledWith({
      where: { id: "ext-1", actif: true, deleted_at: null },
      select: { id: true },
    });
    expect(txMock.commande.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          utilisateur_id: "com-1",
          type_commande: "EXTERNE",
          client_id: null,
          client_externe_id: "ext-1",
        }),
      }),
    );
  });

  it("permet a l'admin de creer une commande rattachee a un administrateur", async () => {
    txMock.user.findFirst.mockResolvedValue({ id: "admin-1" });

    const resultat = await creerCommandeAdmin({
      commercialId: "admin-1",
      typeClient: "EXTERNE",
      clientExterneId: "ext-1",
      lignes: [{ produitId: "prod-1", quantite: "1", prixUnitaire: "23,50" }],
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "admin-1",
        role: { in: ["ADMIN", "COMMERCIAL"] },
        actif: true,
        deleted_at: null,
      },
      select: { id: true },
    });
    expect(txMock.commande.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          utilisateur_id: "admin-1",
          type_commande: "EXTERNE",
        }),
      }),
    );
  });

  it("fige le prix personnalise admin sans modifier le catalogue", async () => {
    const resultat = await creerCommandeAdmin({
      commercialId: "com-1",
      typeClient: "EXTERNE",
      clientExterneId: "ext-1",
      lignes: [{ produitId: "prod-1", quantite: "2", prixUnitaire: "19,90" }],
      totalAnnonce: "39,80",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.commande.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lignes: {
            create: [
              {
                produit_id: "prod-1",
                quantite: "2.000",
                prix_unitaire: "19.90",
                prix_net: "39.80",
              },
            ],
          },
        }),
      }),
    );
    expect(txMock.produit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, prix_reference: true },
      }),
    );
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          donnees_apres: expect.objectContaining({
            lignes: [
              expect.objectContaining({
                prixReference: "23.50",
                prixUnitaire: "19.90",
                prixPersonnalise: true,
              }),
            ],
          }),
        }),
      }),
    );
  });
});

describe("modifierCommandeAdmin", () => {
  it("conserve le prix fige transmis par l'admin et recalcule le net", async () => {
    txMock.commande.findUnique.mockResolvedValue({
      id: "commande-1",
      numero_bl: "CP-000009",
      utilisateur_id: "com-1",
      client_id: "client-1",
      client_externe_id: null,
      type_commande: "STANDARD",
      date_commande: new Date("2026-08-06T12:00:00.000Z"),
      bon_charge: null,
      lignes: [
        {
          id: "ligne-1",
          produit_id: "prod-1",
          quantite: "2.000",
          prix_unitaire: "19.90",
          prix_net: "39.80",
        },
      ],
      paiements: [{ montant: "10.00" }],
    });

    const resultat = await modifierCommandeAdmin({
      commandeId: "commande-1",
      dateCommande: "2026-08-06",
      commercialId: "com-1",
      typeClient: "STANDARD",
      clientId: "client-1",
      lignes: [{ produitId: "prod-1", quantite: "2", prixUnitaire: "19,90" }],
      totalAnnonce: "39,80",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.ligneCommande.createMany).toHaveBeenCalledWith({
      data: [
        {
          commande_id: "commande-1",
          produit_id: "prod-1",
          quantite: "2.000",
          prix_unitaire: "19.90",
          prix_net: "39.80",
        },
      ],
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "commande.modification",
          donnees_apres: expect.objectContaining({
            lignes: [
              expect.objectContaining({
                prixReference: "23.50",
                prixUnitaire: "19.90",
                prixPersonnalise: true,
              }),
            ],
          }),
        }),
      }),
    );
  });
});

describe("ajouterPaiementCommande", () => {
  it("refuse un paiement superieur au reste du", async () => {
    const resultat = await ajouterPaiementCommande({
      commandeId: "commande-1",
      montant: "300,00",
      modePaiement: "ESPECES",
    });

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs?.montant).toContain("dépasse le reste dû");
    }
    expect(txMock.paiement.create).not.toHaveBeenCalled();
  });

  it("verrouille la commande, cree le paiement et audite", async () => {
    const resultat = await ajouterPaiementCommande({
      commandeId: "commande-1",
      montant: "100,00",
      modePaiement: "CHEQUE",
      reference: "CH-1",
    });

    expect(resultat.ok).toBe(true);
    expect(txMock.$queryRaw).toHaveBeenCalled();
    expect(String(txMock.$queryRaw.mock.calls[0][0])).toContain("FOR UPDATE");
    expect(txMock.paiement.create).toHaveBeenCalledWith({
      data: {
        commande_id: "commande-1",
        montant: "100.00",
        mode_paiement: "CHEQUE",
        reference: "CH-1",
        encaisse_par: "admin-1",
      },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "paiement.creation" }),
      }),
    );
  });
});

describe("supprimerCommandeAdmin", () => {
  it("soft delete la commande et ses lignes, puis audite", async () => {
    const resultat = await supprimerCommandeAdmin("commande-1");

    expect(resultat.ok).toBe(true);
    expect(txMock.commande.update).toHaveBeenCalledWith({
      where: { id: "commande-1" },
      data: { deleted_at: expect.any(Date) },
    });
    expect(txMock.ligneCommande.updateMany).toHaveBeenCalledWith({
      where: { commande_id: "commande-1", deleted_at: null },
      data: { deleted_at: expect.any(Date) },
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "commande.suppression" }),
      }),
    );
  });
});
