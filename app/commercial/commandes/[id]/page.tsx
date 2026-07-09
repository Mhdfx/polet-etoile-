import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BadgeStatut } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculerTotauxCommande } from "@/lib/commandes-vue";
import { prisma } from "@/lib/db";
import { formatDateHeure, formatMontant } from "@/lib/format";
import { requireCommercial } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function CommandeCommercialDetailPage({ params }: PageProps) {
  const commercial = await requireCommercial();
  const { id } = await params;

  const commande = await prisma.commande.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      numero_bl: true,
      utilisateur_id: true,
      date_commande: true,
      client: { select: { nom: true, region_ville: true } },
      lignes: {
        where: { deleted_at: null },
        select: {
          id: true,
          quantite: true,
          prix_unitaire: true,
          prix_net: true,
          produit: { select: { nom: true } },
        },
      },
      paiements: { select: { montant: true } },
    },
  });

  if (!commande) {
    notFound();
  }

  if (commande.utilisateur_id !== commercial.id) {
    redirect("/403");
  }

  const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);

  return (
    <AppShell
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/commandes"
      titre={`Commande ${commande.numero_bl}`}
      description="Detail de la commande et etat de paiement calcule."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" asChild>
            <Link href="/commercial/commandes">Retour aux commandes</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/commercial/commandes/${commande.id}/pdf`} target="_blank">
              PDF BL
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
              <CardDescription>{formatDateHeure(commande.date_commande)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p className="font-medium">{commande.client?.nom ?? "-"}</p>
              <p className="text-muted-foreground">
                {commande.client?.region_ville ?? "-"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
              <CardDescription>
                <BadgeStatut statut={totaux.statutPaiement} />
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p>Total : {formatMontant(totaux.total)}</p>
              <p>Payé : {formatMontant(totaux.totalPaye)}</p>
              <p className="font-semibold">Reste : {formatMontant(totaux.resteDu)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantite</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commande.lignes.map((ligne) => (
                <TableRow key={ligne.id}>
                  <TableCell>{ligne.produit.nom}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ligne.quantite.toFixed(3)} kg
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMontant(ligne.prix_unitaire)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMontant(ligne.prix_net)}
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
