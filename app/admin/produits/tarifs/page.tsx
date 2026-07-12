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
import { chargerTarifsDocument } from "@/app/produits/tarifs-data";
import { requireAdmin } from "@/lib/session";

export default async function TarifsProduitsPage() {
  const admin = await requireAdmin();
  const data = await chargerTarifsDocument();

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/produits"
      titre="Liste des prix"
      description="Document imprimable des tarifs produits actifs."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/produits">Retour aux produits</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/produits/tarifs/pdf" target="_blank">
              Telecharger PDF
            </Link>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead className="text-right">Prix en kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.produits.map((produit) => (
                <TableRow key={produit.nom}>
                  <TableCell className="font-medium">{produit.nom}</TableCell>
                  <TableCell className="text-right tabular-nums">{produit.prix}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
