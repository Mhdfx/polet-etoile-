import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { AppShell } from "@/components/app-shell";
import { Bouton } from "@/components/bouton";
import { CarteKPI } from "@/components/carte-kpi";
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
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatMontant, formatQuantite } from "@/lib/format";
import { calculerKpiCommandes, formaterEntreesTop } from "@/lib/kpi";
import { requireCommercial } from "@/lib/session";

type ParametresRecherche = Promise<{ debut?: string; fin?: string }>;

function periodeParDefaut() {
  const maintenant = DateTime.now().setZone(FUSEAU_APPLICATION);
  return {
    debut: maintenant.startOf("month").toISODate()!,
    fin: maintenant.toISODate()!,
  };
}

export default async function KpiCommercialPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const commercial = await requireCommercial();
  const params = await searchParams;
  const defaut = periodeParDefaut();
  const debut = params.debut ?? defaut.debut;
  const fin = params.fin ?? defaut.fin;
  let erreurPeriode: string | undefined;
  let bornes = bornesJourneeInclusive(defaut.debut, defaut.fin);
  try {
    bornes = bornesJourneeInclusive(debut, fin);
  } catch {
    erreurPeriode = "La date fin doit etre posterieure a la date debut.";
  }
  const maintenant = DateTime.now().setZone(FUSEAU_APPLICATION);
  const bornesMois = bornesJourneeInclusive(
    maintenant.startOf("month").toISODate()!,
    maintenant.toISODate()!,
  );
  const bornesJour = bornesJourneeInclusive(
    maintenant.toISODate()!,
    maintenant.toISODate()!,
  );

  const where: Prisma.CommandeWhereInput = {
    utilisateur_id: commercial.id,
    deleted_at: null,
    date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc },
  };

  const [commandes, commandesMois, commandesJour, objectif] = await Promise.all([
    erreurPeriode
      ? Promise.resolve([])
      : prisma.commande.findMany({
          where,
          select: {
            client: { select: { nom: true } },
            client_externe: { select: { nom: true } },
            lignes: {
              where: { deleted_at: null },
              select: { quantite: true, prix_net: true, produit: { select: { nom: true } } },
            },
            paiements: { select: { montant: true } },
          },
        }),
    prisma.commande.findMany({
      where: {
        utilisateur_id: commercial.id,
        deleted_at: null,
        date_commande: { gte: bornesMois.debutUtc, lt: bornesMois.finExclusiveUtc },
      },
      select: { lignes: { where: { deleted_at: null }, select: { quantite: true } } },
    }),
    prisma.commande.findMany({
      where: {
        utilisateur_id: commercial.id,
        deleted_at: null,
        date_commande: { gte: bornesJour.debutUtc, lt: bornesJour.finExclusiveUtc },
      },
      select: { lignes: { where: { deleted_at: null }, select: { quantite: true } } },
    }),
    prisma.objectif.findUnique({
      where: {
        utilisateur_id_mois: {
          utilisateur_id: commercial.id,
          mois: debut.slice(0, 7),
        },
      },
      select: { montant_objectif: true },
    }),
  ]);

  const kpi = calculerKpiCommandes(commandes);
  const quantiteMois = commandesMois.reduce(
    (total, commande) =>
      commande.lignes.reduce((sousTotal, ligne) => sousTotal.plus(ligne.quantite), total),
    new Decimal(0),
  );
  const quantiteJour = commandesJour.reduce(
    (total, commande) =>
      commande.lignes.reduce((sousTotal, ligne) => sousTotal.plus(ligne.quantite), total),
    new Decimal(0),
  );
  const produits = new Map<string, { quantite: Decimal; montant: Decimal }>();
  for (const commande of commandes) {
    for (const ligne of commande.lignes) {
      const entree = produits.get(ligne.produit?.nom ?? "Produit inconnu") ?? {
        quantite: new Decimal(0),
        montant: new Decimal(0),
      };
      entree.quantite = entree.quantite.plus(ligne.quantite);
      entree.montant = entree.montant.plus(ligne.prix_net);
      produits.set(ligne.produit?.nom ?? "Produit inconnu", entree);
    }
  }
  const topProduits = [...produits.entries()]
    .sort((a, b) => b[1].quantite.comparedTo(a[1].quantite))
    .slice(0, 10);
  const objectifMontant = objectif?.montant_objectif ?? null;
  const progression =
    objectifMontant && objectifMontant.gt(0)
      ? `${kpi.chiffreAffaires.mul(100).div(objectifMontant).toFixed(1)} %`
      : "-";

  return (
    <AppShell
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/kpi"
      titre="Mes KPI"
      description="Suivi commercial : ventes, objectif, impayés et meilleurs clients."
    >
      <div className="grid gap-5">
        <form className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
          <div className="grid gap-1.5">
            <Label htmlFor="kpi-debut">Date début</Label>
            <Input id="kpi-debut" name="debut" type="date" defaultValue={debut} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kpi-fin">Date fin</Label>
            <Input id="kpi-fin" name="fin" type="date" defaultValue={fin} />
          </div>
          <Bouton type="submit">Filtrer</Bouton>
        </form>

        {erreurPeriode ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive ring-1 ring-destructive/30">
            {erreurPeriode} Corrigez la periode pour afficher les indicateurs.
          </p>
        ) : null}

        {erreurPeriode ? null : (
          <>
        <div className="grid gap-4 md:grid-cols-6">
          <CarteKPI
            label="Ventes"
            valeur={formatMontant(kpi.chiffreAffaires)}
            tonalite="bleu"
          />
          <CarteKPI
            label="Quantite mois"
            valeur={formatQuantite(quantiteMois)}
            tonalite="bleu"
          />
          <CarteKPI
            label="Quantite jour"
            valeur={formatQuantite(quantiteJour)}
            tonalite="neutre"
          />
          <CarteKPI
            label="Commandes"
            valeur={String(kpi.nombreCommandes)}
            tonalite="neutre"
          />
          <CarteKPI
            label="Impayés"
            valeur={formatMontant(kpi.montantImpaye)}
            tonalite="rouge"
          />
          <CarteKPI
            label="Objectif"
            valeur={objectifMontant ? formatMontant(objectifMontant) : "Non défini"}
            detail={progression}
            tonalite="vert"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Top clients</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpi.topClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                    Aucune donnée sur cette période.
                  </TableCell>
                </TableRow>
              ) : (
                formaterEntreesTop(kpi.topClients).map((ligne) => (
                  <TableRow key={ligne.label}>
                    <TableCell>{ligne.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ligne.montant}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Top produits</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantite</TableHead>
                <TableHead className="text-right">CA</TableHead>
                <TableHead className="text-right">Prix moyen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProduits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    Aucune donnee sur cette periode.
                  </TableCell>
                </TableRow>
              ) : (
                topProduits.map(([produit, ligne]) => (
                  <TableRow key={produit}>
                    <TableCell>{produit}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantite(ligne.quantite)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMontant(ligne.montant)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ligne.quantite.gt(0)
                        ? formatMontant(ligne.montant.div(ligne.quantite))
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
