import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
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
import { formatDate, formatQuantite } from "@/lib/format";
import { sommerQuantites } from "@/lib/decimal";
import { requireAdmin } from "@/lib/session";

type ParametresRecherche = Promise<{ debut?: string; fin?: string }>;

export default async function ChargesAdminPage({
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

  const where: Prisma.BonChargeWhereInput = {
    deleted_at: null,
    ...(erreurPeriode ? { id: { in: [] } } : {}),
    ...(bornes ? { date_charge: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
  };

  const bons = await prisma.bonCharge.findMany({
    where,
    orderBy: { date_charge: "desc" },
    take: 200,
    select: {
      id: true,
      numero_bc: true,
      date_charge: true,
      commercial: { select: { nom_complet: true } },
      lignes: { where: { deleted_at: null }, select: { quantite_kg: true } },
    },
  });

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/charges"
      titre="Bons de charge"
      description="Quantités chargées sur les tournées des commerciaux (sortie de dépôt). Base du rapprochement chargé / vendu / retourné."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
            <div className="grid gap-1.5">
              <Label htmlFor="charges-debut">Date debut</Label>
              <Input id="charges-debut" name="debut" type="date" defaultValue={params.debut ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="charges-fin">Date fin</Label>
              <Input id="charges-fin" name="fin" type="date" defaultValue={params.fin ?? ""} />
            </div>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/admin/charges">Reset</Link>
            </Button>
            {erreurPeriode ? (
              <p role="alert" className="w-full text-sm text-destructive">
                {erreurPeriode}
              </p>
            ) : null}
          </form>

          <Button asChild>
            <Link href="/admin/charges/nouveau">
              <Plus className="h-4 w-4" /> Nouveau bon de charge
            </Link>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° BC</TableHead>
                <TableHead>Date tournée</TableHead>
                <TableHead>Commercial</TableHead>
                <TableHead className="text-right">Lignes</TableHead>
                <TableHead className="text-right">Total chargé</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {bornes || erreurPeriode
                      ? "Aucun bon de charge sur cette periode."
                      : "Aucun bon de charge. Créez-en un pour démarrer une tournée."}
                  </TableCell>
                </TableRow>
              ) : (
                bons.map((bon) => {
                  const totalKg = sommerQuantites(bon.lignes.map((ligne) => ligne.quantite_kg));
                  return (
                    <TableRow key={bon.id}>
                      <TableCell className="font-medium">{bon.numero_bc}</TableCell>
                      <TableCell>{formatDate(bon.date_charge)}</TableCell>
                      <TableCell>{bon.commercial.nom_complet}</TableCell>
                      <TableCell className="text-right tabular-nums">{bon.lignes.length}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantite(totalKg)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/charges/${bon.id}`}>Voir</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
