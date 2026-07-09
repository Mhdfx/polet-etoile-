import { AppShell } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RetourForm } from "@/app/retours/retour-form";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { requireCommercial } from "@/lib/session";

export default async function RetoursCommercialPage() {
  const commercial = await requireCommercial();

  const [produits, retours] = await Promise.all([
    prisma.produit.findMany({
      where: { actif: true, deleted_at: null },
      orderBy: [{ ordre_affichage: "asc" }, { nom: "asc" }],
      select: { id: true, nom: true },
    }),
    prisma.retour.findMany({
      where: { utilisateur_id: commercial.id },
      orderBy: { created_at: "desc" },
      take: 50,
      select: {
        id: true,
        quantite_kg: true,
        commentaire: true,
        created_at: true,
        produit: { select: { nom: true } },
      },
    }),
  ]);

  return (
    <AppShell
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/retours"
      titre="Retours magasin"
      description="Saisie non modifiable et historique recent des retours."
    >
      <div className="grid gap-4">
        <RetourForm produits={produits} />

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantite</TableHead>
                <TableHead>Commentaire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retours.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Aucun retour saisi.
                  </TableCell>
                </TableRow>
              ) : (
                retours.map((retour) => (
                  <TableRow key={retour.id}>
                    <TableCell>{formatDateHeure(retour.created_at)}</TableCell>
                    <TableCell>{retour.produit.nom}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {retour.quantite_kg.toFixed(3)} kg
                    </TableCell>
                    <TableCell>{retour.commentaire ?? "-"}</TableCell>
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
