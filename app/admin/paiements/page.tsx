import Link from "next/link";
import { CreditCard, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AppShell, Panel } from "@/components/app-shell";
import { BadgeStatut } from "@/components/badge-statut";
import { CarteKPI } from "@/components/carte-kpi";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculerTotauxCommande, libelleModePaiement } from "@/lib/commandes-vue";
import { prisma } from "@/lib/db";
import { formatDate, formatDateHeure, formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type ParametresRecherche = Promise<{
  q?: string;
  statut?: string;
}>;

export default async function PaiementsAdminPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const recherche = (params.q ?? "").trim();
  const statut =
    params.statut === "paye" || params.statut === "en_attente"
      ? params.statut
      : "en_attente";

  const where: Prisma.CommandeWhereInput = {
    deleted_at: null,
    ...(recherche
      ? {
          OR: [
            { numero_bl: { contains: recherche } },
            { client: { nom: { contains: recherche } } },
            { client_externe: { nom: { contains: recherche } } },
            { utilisateur: { nom_complet: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const [commandesBrutes, paiementsRecents] = await Promise.all([
    prisma.commande.findMany({
      where,
      orderBy: { date_commande: "desc" },
      take: 5000,
      select: {
        id: true,
        numero_bl: true,
        date_commande: true,
        client: { select: { nom: true } },
        client_externe: { select: { nom: true } },
        utilisateur: { select: { nom_complet: true } },
        lignes: { where: { deleted_at: null }, select: { prix_net: true } },
        paiements: { select: { montant: true } },
      },
    }),
    prisma.paiement.findMany({
      orderBy: { date_paiement: "desc" },
      take: 12,
      select: {
        id: true,
        montant: true,
        mode_paiement: true,
        reference: true,
        date_paiement: true,
        commande: { select: { id: true, numero_bl: true } },
        utilisateur: { select: { nom_complet: true } },
      },
    }),
  ]);

  const commandes = commandesBrutes
    .map((commande) => ({
      ...commande,
      totaux: calculerTotauxCommande(commande.lignes, commande.paiements),
    }))
    .filter((commande) => commande.totaux.statutPaiement === statut)
    .slice(0, 100);

  const totaux = commandesBrutes.reduce(
    (acc, commande) => {
      const total = calculerTotauxCommande(commande.lignes, commande.paiements);
      acc.ca += Number(total.total);
      acc.reste += Number(total.resteDu);
      if (total.statutPaiement === "paye") {
        acc.payees += 1;
      } else {
        acc.enAttente += 1;
      }
      return acc;
    },
    { ca: 0, reste: 0, payees: 0, enAttente: 0 },
  );

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/paiements"
      titre="Paiements"
      description="Suivi des commandes a encaisser et historique recent des paiements."
    >
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-4">
          <CarteKPI label="Non réglées" valeur={String(totaux.enAttente)} tonalite="rouge" />
          <CarteKPI label="Réglées" valeur={String(totaux.payees)} tonalite="vert" />
          <CarteKPI label="CA selection" valeur={formatMontant(totaux.ca)} tonalite="bleu" />
          <CarteKPI label="Reste du" valeur={formatMontant(totaux.reste)} tonalite="rouge" />
        </div>

        <Panel title="Commandes" eyebrow="Encaissement">
          <form className="mb-3 flex flex-wrap items-end gap-2">
            <input
              name="q"
              defaultValue={recherche}
              placeholder="BL, client, commercial..."
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <select
              name="statut"
              defaultValue={statut}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="en_attente">Non réglées</option>
              <option value="paye">Réglées</option>
            </select>
            <Button type="submit" variant="outline">
              <Search />
              Filtrer
            </Button>
          </form>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BL</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Commercial</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paye</TableHead>
                  <TableHead className="text-right">Reste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commandes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Aucune commande pour ce filtre.
                    </TableCell>
                  </TableRow>
                ) : (
                  commandes.map((commande) => (
                    <TableRow key={commande.id}>
                      <TableCell className="font-medium">{commande.numero_bl}</TableCell>
                      <TableCell>{formatDate(commande.date_commande)}</TableCell>
                      <TableCell>{commande.client?.nom ?? commande.client_externe?.nom ?? "-"}</TableCell>
                      <TableCell>{commande.utilisateur.nom_complet}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMontant(commande.totaux.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMontant(commande.totaux.totalPaye)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMontant(commande.totaux.resteDu)}
                      </TableCell>
                      <TableCell>
                        <BadgeStatut statut={commande.totaux.statutPaiement} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild>
                          <Link href={`/admin/commandes/${commande.id}`}>
                            <CreditCard />
                            Encaisser
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel title="Paiements recents" eyebrow="Historique">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>BL</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Encaisse par</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiementsRecents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Aucun paiement enregistre.
                    </TableCell>
                  </TableRow>
                ) : (
                  paiementsRecents.map((paiement) => (
                    <TableRow key={paiement.id}>
                      <TableCell>{formatDateHeure(paiement.date_paiement)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/commandes/${paiement.commande.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {paiement.commande.numero_bl}
                        </Link>
                      </TableCell>
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
        </Panel>
      </div>
    </AppShell>
  );
}
