import Link from "next/link";
import Decimal from "decimal.js";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BadgeStatut } from "@/components/badge-statut";
import { CarteKPI } from "@/components/carte-kpi";
import { DialogueDetailBl } from "@/components/dialogue-detail-bl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculerTotauxCommande, libelleStatutPaiement } from "@/lib/commandes-vue";
import { prisma } from "@/lib/db";
import { formatDate, formatMontant, formatQuantite } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientExterneAdminDetailPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  const client = await prisma.clientExterne.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      nom: true,
      region_ville: true,
      telephone: true,
      commandes: {
        where: { deleted_at: null },
        orderBy: { date_commande: "desc" },
        select: {
          id: true,
          numero_bl: true,
          date_commande: true,
          utilisateur: { select: { nom_complet: true } },
          lignes: {
            where: { deleted_at: null },
            select: {
              produit: { select: { nom: true } },
              quantite: true,
              prix_unitaire: true,
              prix_net: true,
            },
          },
          paiements: { select: { montant: true } },
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const lignes = client.commandes.map((commande) => ({
    commande,
    totaux: calculerTotauxCommande(commande.lignes, commande.paiements),
  }));
  const totalCommande = lignes.reduce((total, ligne) => total.plus(ligne.totaux.total), new Decimal(0));
  const totalPaye = lignes.reduce((total, ligne) => total.plus(ligne.totaux.totalPaye), new Decimal(0));
  const totalNonRegle = lignes.reduce((total, ligne) => total.plus(ligne.totaux.resteDu), new Decimal(0));

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/clients"
      titre={client.nom}
      description="Fiche client externe : BL, commercial associe et statut de paiement."
    >
      <div className="grid gap-5">
        <Button variant="outline" asChild className="w-fit">
          <Link href="/admin/clients">Retour aux clients</Link>
        </Button>

        <div className="grid gap-4 md:grid-cols-4">
          <CarteKPI label="Montant commande" valeur={formatMontant(totalCommande)} tonalite="bleu" />
          <CarteKPI label="Montant paye" valeur={formatMontant(totalPaye)} tonalite="vert" />
          <CarteKPI label="Non regle" valeur={formatMontant(totalNonRegle)} tonalite="rouge" />
          <CarteKPI label="BL" valeur={String(client.commandes.length)} tonalite="neutre" />
        </div>

        <section className="rounded-lg bg-card p-4 text-sm shadow-sm ring-1 ring-border">
          <div className="grid gap-2 md:grid-cols-2">
            <p><span className="text-muted-foreground">Ville : </span>{client.region_ville}</p>
            <p><span className="text-muted-foreground">Telephone : </span>{client.telephone ?? "-"}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BL</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Commercial</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Paye</TableHead>
                <TableHead className="text-right">Reste</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun BL pour ce client externe.</TableCell>
                </TableRow>
              ) : (
                lignes.map(({ commande, totaux }) => (
                  <TableRow key={commande.id}>
                    <TableCell>
                      <DialogueDetailBl
                        numeroBl={commande.numero_bl}
                        date={formatDate(commande.date_commande)}
                        statut={libelleStatutPaiement(totaux.statutPaiement)}
                        total={formatMontant(totaux.total)}
                        lienDetail={`/admin/commandes/${commande.id}`}
                        lignes={commande.lignes.map((ligne) => ({
                          produit: ligne.produit.nom,
                          quantite: formatQuantite(ligne.quantite),
                          prixUnitaire: formatMontant(ligne.prix_unitaire),
                          prixNet: formatMontant(ligne.prix_net),
                        }))}
                      />
                    </TableCell>
                    <TableCell>{formatDate(commande.date_commande)}</TableCell>
                    <TableCell>{commande.utilisateur.nom_complet}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMontant(totaux.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMontant(totaux.totalPaye)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMontant(totaux.resteDu)}</TableCell>
                    <TableCell><BadgeStatut statut={totaux.statutPaiement} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </AppShell>
  );
}

