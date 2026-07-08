import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatDate, formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ProduitsTable } from "./produits-table";

const TAILLE_PAGE = 10;

type ParametresRecherche = Promise<{ page?: string; q?: string }>;

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const utilisateur = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const recherche = (params.q ?? "").trim();

  const where = {
    deleted_at: null,
    ...(recherche
      ? {
          OR: [
            { nom: { contains: recherche } },
            { categorie: { contains: recherche } },
          ],
        }
      : {}),
  };

  const [totalLignes, produits, categories] = await prisma.$transaction([
    prisma.produit.count({ where }),
    prisma.produit.findMany({
      where,
      orderBy: [{ ordre_affichage: "asc" }, { nom: "asc" }],
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
    }),
    prisma.produit.findMany({
      where: { deleted_at: null },
      select: { categorie: true },
      distinct: ["categorie"],
      orderBy: { categorie: "asc" },
    }),
  ]);

  const lignes = produits.map((produit) => ({
    id: produit.id,
    nom: produit.nom,
    categorie: produit.categorie,
    unite: produit.unite,
    prixReference: formatMontant(produit.prix_reference),
    actif: produit.actif,
    modifieLe: formatDate(produit.updated_at),
  }));

  return (
    <AppShell
      utilisateur={utilisateur}
      espace="admin"
      cheminActif="/admin/produits"
      titre="Produits et prix"
      description="Catalogue avicole — écran de référence liste + formulaire. Lecture seule tant que le schéma n'est pas gelé (Phase 4 pour le CRUD)."
    >
      <ProduitsTable
        lignes={lignes}
        page={page}
        taillePage={TAILLE_PAGE}
        totalLignes={totalLignes}
        recherche={recherche}
        categories={categories.map((c) => c.categorie)}
      />
    </AppShell>
  );
}
