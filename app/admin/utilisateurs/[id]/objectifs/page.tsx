import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DateTime } from "luxon";
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
import { formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ObjectifForm } from "./objectif-form";

function formatMois(mois: string): string {
  const [annee, numero] = mois.split("-");
  return `${numero}/${annee}`;
}

export default async function ObjectifsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const commercial = await prisma.user.findFirst({
    where: { id, role: "COMMERCIAL", deleted_at: null },
    select: { nom_complet: true },
  });

  if (!commercial) {
    notFound();
  }

  const objectifs = await prisma.objectif.findMany({
    where: { utilisateur_id: id },
    orderBy: { mois: "desc" },
    take: 24,
    include: { createur: { select: { nom_complet: true } } },
  });

  const moisCourant = DateTime.now()
    .setZone("Africa/Casablanca")
    .toFormat("yyyy-MM");

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/utilisateurs"
      titre={`Objectifs mensuels — ${commercial.nom_complet}`}
      description="Objectif de chiffre d'affaires en DH par mois. Saisir un mois déjà défini remplace l'objectif existant."
    >
      <div className="grid gap-4">
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/utilisateurs">
              <ArrowLeft />
              Retour aux utilisateurs
            </Link>
          </Button>
        </div>

        <ObjectifForm utilisateurId={id} moisParDefaut={moisCourant} />

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead className="text-right">Objectif</TableHead>
                <TableHead>Défini par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {objectifs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aucun objectif défini pour ce commercial.
                  </TableCell>
                </TableRow>
              ) : (
                objectifs.map((objectif) => (
                  <TableRow key={objectif.id}>
                    <TableCell className="font-medium text-foreground">
                      {formatMois(objectif.mois)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMontant(objectif.montant_objectif)}
                    </TableCell>
                    <TableCell>{objectif.createur.nom_complet}</TableCell>
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
