import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  Scale,
  Settings,
  Target,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { AppShell, Panel } from "@/components/app-shell";
import { CarteKPI } from "@/components/carte-kpi";
import { Bouton } from "@/components/bouton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatMontant, formatQuantite } from "@/lib/format";
import {
  calculerImpayeTotal,
  calculerKpiPeriode,
  filtrerCommandesPeriode,
} from "@/lib/kpi";
import { calculerCartesEpinglees, lireEpinglesKpi } from "@/lib/kpi-epingles";
import { requireAdmin } from "@/lib/session";

const raccourcisAdmin = [
  { label: "Paramétrage", href: "/admin/parametres", icon: Settings },
  { label: "Objectifs commerciaux", href: "/admin/objectifs", icon: Target },
  { label: "Journal d'audit", href: "/admin/audit", icon: FileText },
  { label: "Sessions actives", href: "/admin/sessions", icon: UserCog },
  { label: "Toutes les commandes", href: "/admin/commandes", icon: ClipboardList },
  { label: "Audit KPIs", href: "/admin/kpi", icon: BarChart3 },
];

type ParametresRecherche = Promise<{
  debut?: string;
  fin?: string;
  commercial?: string;
}>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const utilisateur = await requireAdmin();
  const params = await searchParams;

  const maintenant = DateTime.now().setZone(FUSEAU_APPLICATION);
  const aujourdhuiIso = maintenant.toISODate()!;
  const debutMoisIso = maintenant.startOf("month").toISODate()!;
  const debutAnneeIso = maintenant.startOf("year").toISODate()!;

  const commercial = params.commercial || undefined;
  const debutPeriode = params.debut ?? debutAnneeIso;
  const finPeriode = params.fin ?? aujourdhuiIso;

  let erreurPeriode: string | null = null;
  let bornesPeriode: { debutUtc: Date; finExclusiveUtc: Date } | null = null;
  try {
    bornesPeriode = bornesJourneeInclusive(debutPeriode, finPeriode);
  } catch {
    erreurPeriode =
      "La date de fin doit être égale ou postérieure à la date de début.";
  }

  const bornesMois = bornesJourneeInclusive(debutMoisIso, aujourdhuiIso);
  const bornesJour = bornesJourneeInclusive(aujourdhuiIso, aujourdhuiIso);

  const filtreCommercial: Prisma.CommandeWhereInput = commercial
    ? { utilisateur_id: commercial }
    : {};

  const [commandesMois, commandesPeriode, commandesImpaye, commerciaux] =
    await Promise.all([
      prisma.commande.findMany({
        where: {
          deleted_at: null,
          ...filtreCommercial,
          date_commande: {
            gte: bornesMois.debutUtc,
            lt: bornesMois.finExclusiveUtc,
          },
        },
        select: {
          date_commande: true,
          lignes: {
            where: { deleted_at: null },
            select: { prix_net: true, quantite: true },
          },
        },
      }),
      bornesPeriode
        ? prisma.commande.findMany({
            where: {
              deleted_at: null,
              ...filtreCommercial,
              date_commande: {
                gte: bornesPeriode.debutUtc,
                lt: bornesPeriode.finExclusiveUtc,
              },
            },
            select: {
              date_commande: true,
              lignes: {
                where: { deleted_at: null },
                select: { prix_net: true, quantite: true },
              },
            },
          })
        : Promise.resolve([]),
      prisma.commande.findMany({
        where: { deleted_at: null, ...filtreCommercial },
        select: {
          lignes: { where: { deleted_at: null }, select: { prix_net: true } },
          paiements: { select: { montant: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "COMMERCIAL", deleted_at: null },
        orderBy: { nom_complet: "asc" },
        select: { id: true, nom_complet: true },
      }),
    ]);

  const cartesEpinglees = await calculerCartesEpinglees(await lireEpinglesKpi());

  const kpiMois = calculerKpiPeriode(commandesMois);
  const kpiJour = calculerKpiPeriode(
    filtrerCommandesPeriode(
      commandesMois,
      bornesJour.debutUtc,
      bornesJour.finExclusiveUtc,
    ),
  );
  const kpiPeriode = calculerKpiPeriode(commandesPeriode);
  const impaye = calculerImpayeTotal(commandesImpaye);

  const periodeMois = `Du ${formatDate(bornesMois.debutUtc)} au ${formatDate(maintenant.toJSDate())}`;
  const nomCommercial = commercial
    ? commerciaux.find((item) => item.id === commercial)?.nom_complet ?? null
    : null;

  return (
    <AppShell
      utilisateur={utilisateur}
      espace="admin"
      cheminActif="/admin"
      titre="Tableau de bord consolidé"
      description={`Connecté : ${utilisateur.nom_complet} · Rôle : ADMINISTRATEUR${nomCommercial ? ` · Filtre : ${nomCommercial}` : " · Tous les commerciaux"}`}
    >
      <div className="grid gap-4">
        <form className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
          <div className="grid gap-1.5">
            <Label htmlFor="filtre-debut">Date début</Label>
            <Input
              id="filtre-debut"
              name="debut"
              type="date"
              defaultValue={debutPeriode}
              className="bg-card"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtre-fin">Date fin</Label>
            <Input
              id="filtre-fin"
              name="fin"
              type="date"
              defaultValue={finPeriode}
              className="bg-card"
            />
          </div>
          <div className="grid min-w-44 gap-1.5">
            <Label htmlFor="filtre-commercial">Commercial</Label>
            <SelectNatif
              id="filtre-commercial"
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

        {erreurPeriode ? (
          <p className="rounded-md border border-alerte/40 bg-alerte/10 px-3 py-2 text-sm text-alerte">
            {erreurPeriode}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <CarteKPI
            label="Chiffre d'affaires du mois"
            valeur={formatMontant(kpiMois.chiffreAffaires)}
            detail={periodeMois}
            tonalite="bleu"
            icon={TrendingUp}
          />
          <CarteKPI
            label="Quantité du mois"
            valeur={formatQuantite(kpiMois.quantite)}
            detail={periodeMois}
            tonalite="neutre"
            icon={Scale}
          />
          <CarteKPI
            label="Chiffre d'affaires du jour"
            valeur={formatMontant(kpiJour.chiffreAffaires)}
            detail={formatDate(maintenant.toJSDate())}
            tonalite="vert"
            icon={CalendarDays}
          />
          <CarteKPI
            label="Quantité du jour"
            valeur={formatQuantite(kpiJour.quantite)}
            detail={formatDate(maintenant.toJSDate())}
            tonalite="neutre"
            icon={Scale}
          />
          <CarteKPI
            label="Chiffre non réglé"
            valeur={formatMontant(impaye)}
            detail="Toutes commandes confondues"
            tonalite="rouge"
            icon={AlertTriangle}
          />
        </div>

        {cartesEpinglees.length > 0 ? (
          <section className="grid gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              KPI épinglés
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cartesEpinglees.map((carte) => (
                <CarteKPI
                  key={carte.cle}
                  label={carte.label}
                  valeur={carte.valeur}
                  detail={carte.detail}
                  tonalite={carte.tonalite}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <Panel
            title="Période personnalisée"
            eyebrow={
              bornesPeriode
                ? `Du ${formatDate(bornesPeriode.debutUtc)} au ${formatDate(finPeriode)}`
                : "Période invalide"
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Chiffre d&apos;affaires</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatMontant(kpiPeriode.chiffreAffaires)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantité</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatQuantite(kpiPeriode.quantite)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commandes</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {kpiPeriode.nombreCommandes}
                </p>
              </div>
            </div>
            {bornesPeriode && kpiPeriode.nombreCommandes === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Aucune commande sur cette période.
              </p>
            ) : null}
          </Panel>

          <Panel title="Pilotage" eyebrow="Raccourcis admin">
            <div className="grid gap-3 sm:grid-cols-2">
              {raccourcisAdmin.map((raccourci) => {
                const Icon = raccourci.icon;
                return (
                  <Link
                    key={raccourci.href}
                    href={raccourci.href}
                    className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {raccourci.label}
                  </Link>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
