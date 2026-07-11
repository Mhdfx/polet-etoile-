import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
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
import { sommerQuantites } from "@/lib/decimal";
import { formatDate, formatDateHeure, formatQuantite } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { SupprimerBonChargeBouton } from "./supprimer-bouton";

export default async function DetailBonChargePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const bon = await prisma.bonCharge.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      numero_bc: true,
      date_charge: true,
      commentaire: true,
      created_at: true,
      commande: { select: { id: true, numero_bl: true } },
      commercial: { select: { nom_complet: true } },
      createur: { select: { nom_complet: true } },
      lignes: {
        where: { deleted_at: null },
        select: { id: true, quantite_kg: true, produit: { select: { nom: true } } },
      },
    },
  });

  if (!bon) {
    notFound();
  }

  const totalKg = sommerQuantites(bon.lignes.map((ligne) => ligne.quantite_kg));

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/charges"
      titre={`Bon de charge ${bon.numero_bc}`}
      description="Détail des quantités chargées sur la tournée."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/admin/charges">
              <ArrowLeft className="h-4 w-4" /> Retour aux bons de charge
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/charges/${bon.id}/pdf`}>
                <Download className="h-4 w-4" /> Telecharger PDF
              </Link>
            </Button>
            <SupprimerBonChargeBouton
              bonChargeId={bon.id}
              numeroBc={bon.numero_bc}
              commandeId={bon.commande?.id}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Commercial
            </p>
            <p className="text-sm font-medium">{bon.commercial.nom_complet}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Commande source
            </p>
            {bon.commande ? (
              <Link
                href={`/admin/commandes/${bon.commande.id}`}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {bon.commande.numero_bl}
              </Link>
            ) : (
              <p className="text-sm font-medium">Saisie manuelle</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Date tournée
            </p>
            <p className="text-sm font-medium">{formatDate(bon.date_charge)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total chargé
            </p>
            <p className="text-sm font-medium tabular-nums">{formatQuantite(totalKg)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Saisi par
            </p>
            <p className="text-sm font-medium">
              {bon.createur.nom_complet} · {formatDateHeure(bon.created_at)}
            </p>
          </div>
        </div>

        {bon.commentaire ? (
          <p className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            {bon.commentaire}
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité chargée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bon.lignes.map((ligne) => (
                <TableRow key={ligne.id}>
                  <TableCell>{ligne.produit.nom}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantite(ligne.quantite_kg)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantite(totalKg)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
