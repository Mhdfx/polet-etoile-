import { AppShell } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export default async function RetoursAdminPage() {
  const admin = await requireAdmin();
  const retours = await prisma.retour.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
    select: {
      id: true,
      quantite_kg: true,
      commentaire: true,
      created_at: true,
      produit: { select: { nom: true } },
      utilisateur: { select: { nom_complet: true } },
    },
  });

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/retours"
      titre="Retours"
      description="Vue admin des retours magasin saisis par les commerciaux."
    >
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">Quantite</TableHead>
              <TableHead>Commentaire</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retours.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucun retour.
                </TableCell>
              </TableRow>
            ) : (
              retours.map((retour) => (
                <TableRow key={retour.id}>
                  <TableCell>{formatDateHeure(retour.created_at)}</TableCell>
                  <TableCell>{retour.utilisateur.nom_complet}</TableCell>
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
    </AppShell>
  );
}
