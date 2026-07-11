import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { listerCategoriesProduits } from "@/lib/categories";
import { formatDate, formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ProduitsTable } from "./produits-table";

type ParametresRecherche = Promise<{ q?: string }>;

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const utilisateur = await requireAdmin();
  const params = await searchParams;
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

  const [produits, categories] = await Promise.all([
    prisma.produit.findMany({
      where,
      orderBy: [{ ordre_affichage: "asc" }, { nom: "asc" }],
    }),
    listerCategoriesProduits(),
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
      description="Catalogue avicole : création, modification, changement de prix tracé, activation et suppression logique."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/admin/produits/categories">Categories</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/produits/prix">Prix en masse</Link>
        </Button>
      </div>
      <ProduitsTable
        lignes={lignes}
        recherche={recherche}
        categories={categories}
      />
    </AppShell>
  );
}
