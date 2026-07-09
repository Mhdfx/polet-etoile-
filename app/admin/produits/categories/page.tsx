import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { listerCategoriesProduits } from "@/lib/categories";
import { formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { CategoriesForm } from "./categories-form";

export default async function CategoriesProduitsPage() {
  const admin = await requireAdmin();
  const [produits, categories] = await Promise.all([
    prisma.produit.findMany({
      where: { deleted_at: null },
      orderBy: [{ categorie: "asc" }, { ordre_affichage: "asc" }],
      select: { categorie: true, actif: true, prix_reference: true },
    }),
    listerCategoriesProduits(),
  ]);

  const stats = categories.map((categorie) => {
    const lignes = produits.filter((produit) => produit.categorie === categorie);
    if (lignes.length === 0) {
      return {
        categorie,
        total: 0,
        actifs: 0,
        prixMin: null,
        prixMax: null,
      };
    }
    return {
      categorie,
      total: lignes.length,
      actifs: lignes.filter((produit) => produit.actif).length,
      prixMin: lignes.reduce(
        (min, produit) => (produit.prix_reference.lt(min) ? produit.prix_reference : min),
        lignes[0].prix_reference,
      ),
      prixMax: lignes.reduce(
        (max, produit) => (produit.prix_reference.gt(max) ? produit.prix_reference : max),
        lignes[0].prix_reference,
      ),
    };
  });

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/produits"
      titre="Categories produits"
      description="Renommage de categories et mise a jour des prix par pourcentage."
    >
      <div className="grid gap-5">
        <Button variant="outline" asChild className="w-fit">
          <Link href="/admin/produits">Retour produits</Link>
        </Button>
        <CategoriesForm categories={categories} />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categorie</TableHead>
                <TableHead className="text-right">Produits</TableHead>
                <TableHead className="text-right">Actifs</TableHead>
                <TableHead className="text-right">Prix min</TableHead>
                <TableHead className="text-right">Prix max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((ligne) => (
                <TableRow key={ligne.categorie}>
                  <TableCell>{ligne.categorie}</TableCell>
                  <TableCell className="text-right tabular-nums">{ligne.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{ligne.actifs}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ligne.prixMin ? formatMontant(ligne.prixMin) : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ligne.prixMax ? formatMontant(ligne.prixMax) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
