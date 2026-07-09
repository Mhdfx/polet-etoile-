import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type ParametresRecherche = Promise<{ debut?: string; fin?: string }>;

export default async function RetoursAdminPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;
  let erreurPeriode: string | undefined;
  if (params.debut && params.fin) {
    try {
      bornes = bornesJourneeInclusive(params.debut, params.fin);
    } catch {
      erreurPeriode = "La date fin doit etre egale ou posterieure a la date debut.";
    }
  }

  const where: Prisma.RetourWhereInput = {
    // Periode invalide : aucun resultat plutot qu'une liste non filtree trompeuse.
    ...(erreurPeriode ? { id: { in: [] } } : {}),
    ...(bornes ? { created_at: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
  };

  const retours = await prisma.retour.findMany({
    where,
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
      <div className="grid gap-4">
        <form className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
          <div className="grid gap-1.5">
            <Label htmlFor="retours-debut">Date debut</Label>
            <Input id="retours-debut" name="debut" type="date" defaultValue={params.debut ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="retours-fin">Date fin</Label>
            <Input id="retours-fin" name="fin" type="date" defaultValue={params.fin ?? ""} />
          </div>
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/retours">Reset</Link>
          </Button>
          {erreurPeriode ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {erreurPeriode}
            </p>
          ) : null}
        </form>

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
                    {bornes || erreurPeriode ? "Aucun retour sur cette periode." : "Aucun retour."}
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
      </div>
    </AppShell>
  );
}
