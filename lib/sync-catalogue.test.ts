import { describe, expect, it, vi } from "vitest";
import { CATALOGUE_VERSION, PRODUITS_CDC } from "@/lib/catalogue-cdc";
import { syncCatalogueCdc } from "@/lib/sync-catalogue";

describe("syncCatalogueCdc", () => {
  it("contient les 26 produits CDC section 14", () => {
    expect(PRODUITS_CDC).toHaveLength(26);
    expect(PRODUITS_CDC.map((p) => p.nom)).toContain("POULET ENTIER");
    expect(PRODUITS_CDC.map((p) => p.nom)).toContain("RELIQUAT PAYEMENT");
  });

  it("cree les produits CDC et enregistre les versions", async () => {
    const produits = new Map<string, Record<string, unknown>>();
    const parametres = new Map<string, { cle: string; valeur: string }>();

    const prisma = {
      produit: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          const row = produits.get(where.id);
          return row ?? null;
        }),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          produits.set(String(data.id), { ...data, actif: true, deleted_at: null });
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const existant = produits.get(where.id) ?? {};
          produits.set(where.id, { ...existant, ...data });
        }),
      },
      parametreSysteme: {
        upsert: vi.fn(
          async ({
            where,
            create,
            update,
          }: {
            where: { cle: string };
            create: { cle: string; valeur: string };
            update: { valeur: string };
          }) => {
            const valeur = parametres.has(where.cle) ? update.valeur : create.valeur;
            parametres.set(where.cle, { cle: where.cle, valeur });
          },
        ),
      },
    };

    const resultat = await syncCatalogueCdc(prisma as never, {
      versionApp: "1.0.0",
      utilisateurId: "admin-id",
    });

    expect(resultat.produitsCrees).toBe(26);
    expect(resultat.produitsMisAJour).toBe(0);
    expect(resultat.catalogueVersion).toBe(CATALOGUE_VERSION);
    expect(parametres.get("catalogue_version")?.valeur).toBe(CATALOGUE_VERSION);
    expect(parametres.get("app_version")?.valeur).toBe("1.0.0");
  });

  it("ne modifie pas prix_reference si mettreAJourPrix est false", async () => {
    const produits = new Map([
      [
        "seed-produit-230",
        {
          id: "seed-produit-230",
          nom: "POULET ENTIER",
          prix_reference: "99.00",
          actif: true,
          deleted_at: null,
        },
      ],
    ]);

    const prisma = {
      produit: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => produits.get(where.id) ?? null),
        create: vi.fn(),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const existant = produits.get(where.id)!;
          produits.set(where.id, { ...existant, ...data });
        }),
      },
      parametreSysteme: {
        upsert: vi.fn(async () => undefined),
      },
    };

    await syncCatalogueCdc(prisma as never, { mettreAJourPrix: false, versionApp: "0.1.0" });

    expect(produits.get("seed-produit-230")?.prix_reference).toBe("99.00");
  });
});
