import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { formatDateHeure, formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export default async function HistoriquePrixPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const utilisateur = await requireAdmin();
  const { id } = await params;

  const produit = await prisma.produit.findFirst({
    where: { id, deleted_at: null },
    select: { nom: true, prix_reference: true },
  });

  if (!produit) {
    notFound();
  }

  const historique = await prisma.historiquePrix.findMany({
    where: { produit_id: id },
    orderBy: { date: "desc" },
    take: 100,
    include: { utilisateur: { select: { nom_complet: true } } },
  });

  return (
    <AppShell
      utilisateur={utilisateur}
      espace="admin"
      cheminActif="/admin/produits"
      titre={`Historique des prix — ${produit.nom}`}
      description={`Prix de référence actuel : ${formatMontant(produit.prix_reference)}. Les commandes passées conservent leur prix figé.`}
    >
      <div className="grid gap-4">
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/produits">
              <ArrowLeft />
              Retour aux produits
            </Link>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Ancien prix</TableHead>
                <TableHead className="text-right">Nouveau prix</TableHead>
                <TableHead>Modifié par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historique.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Aucun changement de prix enregistré pour ce produit.
                  </TableCell>
                </TableRow>
              ) : (
                historique.map((entree) => (
                  <TableRow key={entree.id}>
                    <TableCell>{formatDateHeure(entree.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMontant(entree.ancien_prix)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMontant(entree.nouveau_prix)}
                    </TableCell>
                    <TableCell>{entree.utilisateur.nom_complet}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
