import Link from "next/link";
import { notFound } from "next/navigation";
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
import { PaiementForm } from "@/app/commandes/paiement-form";
import { SupprimerCommandeButton } from "@/app/commandes/supprimer-commande-button";
import {
  calculerTotauxCommande,
  libelleModePaiement,
  libelleTypeCommande,
} from "@/lib/commandes-vue";
import { prisma } from "@/lib/db";
import { formatDateHeure, formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function CommandeAdminDetailPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  const commande = await prisma.commande.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      numero_bl: true,
      type_commande: true,
      date_commande: true,
      client: { select: { nom: true, region_ville: true } },
      client_externe: { select: { nom: true, region_ville: true } },
      utilisateur: { select: { nom_complet: true, nom_utilisateur: true } },
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
      paiements: {
        orderBy: { date_paiement: "desc" },
        select: {
          id: true,
          montant: true,
          mode_paiement: true,
          reference: true,
          date_paiement: true,
          utilisateur: { select: { nom_complet: true } },
        },
      },
    },
  });

  if (!commande) {
    notFound();
  }

  const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);
  const client = commande.client ?? commande.client_externe;

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/commandes"
      titre={`Commande ${commande.numero_bl}`}
      description="Detail commande, paiements et suppression logique admin."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/commandes">Retour aux commandes</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/commandes/${commande.id}/pdf`} target="_blank">
                PDF BL
              </Link>
            </Button>
            <SupprimerCommandeButton commandeId={commande.id} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
              <CardDescription>
                {libelleTypeCommande(commande.type_commande)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p className="font-medium">{client?.nom ?? "-"}</p>
              <p className="text-muted-foreground">{client?.region_ville ?? "-"}</p>
              <p className="text-muted-foreground">
                {formatDateHeure(commande.date_commande)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commercial</CardTitle>
              <CardDescription>Compte rattache</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p className="font-medium">{commande.utilisateur.nom_complet}</p>
              <p className="text-muted-foreground">
                {commande.utilisateur.nom_utilisateur}
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

        <Card>
          <CardHeader>
            <CardTitle>Lignes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paiements</CardTitle>
            <CardDescription>Ajout admin uniquement, montant limite au reste du.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <PaiementForm commandeId={commande.id} />
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Encaisse par</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commande.paiements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        Aucun paiement.
                      </TableCell>
                    </TableRow>
                  ) : (
                    commande.paiements.map((paiement) => (
                      <TableRow key={paiement.id}>
                        <TableCell>{formatDateHeure(paiement.date_paiement)}</TableCell>
                        <TableCell>{libelleModePaiement(paiement.mode_paiement)}</TableCell>
                        <TableCell>{paiement.reference ?? "-"}</TableCell>
                        <TableCell>{paiement.utilisateur.nom_complet}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMontant(paiement.montant)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
