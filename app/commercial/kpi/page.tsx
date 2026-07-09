import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { AppShell } from "@/components/app-shell";
import { CarteKPI } from "@/components/carte-kpi";
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
import { formatMontant } from "@/lib/format";
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
  const bornes = bornesJourneeInclusive(debut, fin);

  const where: Prisma.CommandeWhereInput = {
    utilisateur_id: commercial.id,
    deleted_at: null,
    date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc },
  };

  const [commandes, objectif] = await Promise.all([
    prisma.commande.findMany({
      where,
      select: {
        client: { select: { nom: true } },
        client_externe: { select: { nom: true } },
        lignes: {
          where: { deleted_at: null },
          select: { prix_net: true, produit: { select: { nom: true } } },
        },
        paiements: { select: { montant: true } },
      },
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
  const objectifMontant =
    objectif?.montant_objectif ?? kpi.chiffreAffaires.minus(kpi.chiffreAffaires);
  const progression =
    objectifMontant.gt(0)
      ? `${kpi.chiffreAffaires.mul(100).div(objectifMontant).toFixed(1)} %`
      : "-";

  return (
    <AppShell
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/kpi"
      titre="Mes KPI"
      description="Suivi commercial : ventes, objectif, impayes et meilleurs clients."
    >
      <div className="grid gap-5">
        <form className="flex flex-wrap items-end gap-2">
          <input
            name="debut"
            type="date"
            defaultValue={debut}
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          />
          <input
            name="fin"
            type="date"
            defaultValue={fin}
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          />
          <button className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Filtrer
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-4">
          <CarteKPI
            label="Ventes"
            valeur={formatMontant(kpi.chiffreAffaires)}
            tonalite="bleu"
          />
          <CarteKPI
            label="Commandes"
            valeur={String(kpi.nombreCommandes)}
            tonalite="neutre"
          />
          <CarteKPI
            label="Impayes"
            valeur={formatMontant(kpi.montantImpaye)}
            tonalite="rouge"
          />
          <CarteKPI
            label="Objectif"
            valeur={formatMontant(objectifMontant)}
            detail={progression}
            tonalite="vert"
          />
        </div>

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
                    Aucune donnee.
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
      </div>
    </AppShell>
  );
}
