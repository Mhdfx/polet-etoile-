import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { AppShell } from "@/components/app-shell";
import { Bouton } from "@/components/bouton";
import { CarteKPI } from "@/components/carte-kpi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculerKpiCommandes, formaterEntreesTop } from "@/lib/kpi";
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type ParametresRecherche = Promise<{
  debut?: string;
  fin?: string;
  commercial?: string;
}>;

function periodeParDefaut() {
  const maintenant = DateTime.now().setZone(FUSEAU_APPLICATION);
  return {
    debut: maintenant.startOf("month").toISODate()!,
    fin: maintenant.toISODate()!,
  };
}

export default async function KpiAdminPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const defaut = periodeParDefaut();
  const debut = params.debut ?? defaut.debut;
  const fin = params.fin ?? defaut.fin;
  const commercial = params.commercial || undefined;
  const bornes = bornesJourneeInclusive(debut, fin);

  const where: Prisma.CommandeWhereInput = {
    deleted_at: null,
    date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc },
    ...(commercial ? { utilisateur_id: commercial } : {}),
  };

  const [commandes, commerciaux, objectifs] = await Promise.all([
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
    prisma.user.findMany({
      where: { role: "COMMERCIAL", deleted_at: null },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
    prisma.objectif.findMany({
      where: {
        mois: debut.slice(0, 7),
        ...(commercial ? { utilisateur_id: commercial } : {}),
      },
      select: { montant_objectif: true },
    }),
  ]);

  const kpi = calculerKpiCommandes(commandes);
  const objectifTotal = objectifs.reduce(
    (total, objectif) => total.plus(objectif.montant_objectif),
    kpi.chiffreAffaires.minus(kpi.chiffreAffaires),
  );
  const progression =
    objectifTotal.gt(0)
      ? `${kpi.chiffreAffaires.mul(100).div(objectifTotal).toFixed(1)} %`
      : "-";

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/kpi"
      titre="Audit KPIs"
      description="Indicateurs consolidés : ventes, commandes, impayés et tops."
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
          <div className="grid min-w-44 gap-1.5">
            <Label htmlFor="kpi-commercial">Commercial</Label>
            <SelectNatif
              id="kpi-commercial"
              name="commercial"
              defaultValue={commercial ?? ""}
            >
              <option value="">Tous les commerciaux</option>
              {commerciaux.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nom_complet}
                </option>
              ))}
            </SelectNatif>
          </div>
          <Bouton type="submit">Filtrer</Bouton>
        </form>

        <div className="grid gap-4 md:grid-cols-4">
          <CarteKPI
            label="Chiffre d'affaires"
            valeur={formatMontant(kpi.chiffreAffaires)}
            tonalite="bleu"
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
            valeur={formatMontant(objectifTotal)}
            detail={progression}
            tonalite="vert"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopTable titre="Top clients" lignes={formaterEntreesTop(kpi.topClients)} />
          <TopTable titre="Top produits" lignes={formaterEntreesTop(kpi.topProduits)} />
        </div>
      </div>
    </AppShell>
  );
}

function TopTable({
  titre,
  lignes,
}: {
  titre: string;
  lignes: Array<{ label: string; montant: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold">{titre}</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                Aucune donnée sur cette période.
              </TableCell>
            </TableRow>
          ) : (
            lignes.map((ligne) => (
              <TableRow key={ligne.label}>
                <TableCell>{ligne.label}</TableCell>
                <TableCell className="text-right tabular-nums">{ligne.montant}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
