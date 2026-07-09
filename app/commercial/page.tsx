import Link from "next/link";
import { DateTime } from "luxon";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  RotateCcw,
  Scale,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { AppShell, Panel } from "@/components/app-shell";
import { CarteKPI } from "@/components/carte-kpi";
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { decimal } from "@/lib/decimal";
import { formatDate, formatMontant, formatQuantite } from "@/lib/format";
import {
  calculerImpayeTotal,
  calculerKpiPeriode,
  filtrerCommandesPeriode,
} from "@/lib/kpi";
import { requireCommercial } from "@/lib/session";

const raccourcisVentes = [
  {
    label: "Passer une commande",
    href: "/commercial/commandes/nouvelle",
    icon: ShoppingCart,
  },
  { label: "Voir les commandes", href: "/commercial/commandes", icon: ClipboardList },
  {
    label: "Voir les commandes externes",
    href: "/commercial/commandes/externes",
    icon: ExternalLink,
  },
  { label: "Retours magasin", href: "/commercial/retours", icon: RotateCcw },
  { label: "Audit KPIs", href: "/commercial/kpi", icon: BarChart3 },
];

export default async function CommercialPage() {
  const utilisateur = await requireCommercial();

  const maintenant = DateTime.now().setZone(FUSEAU_APPLICATION);
  const aujourdhuiIso = maintenant.toISODate()!;
  const debutMoisIso = maintenant.startOf("month").toISODate()!;
  const bornesMois = bornesJourneeInclusive(debutMoisIso, aujourdhuiIso);
  const bornesJour = bornesJourneeInclusive(aujourdhuiIso, aujourdhuiIso);

  const [commandesMois, commandesImpaye, objectif] = await Promise.all([
    prisma.commande.findMany({
      where: {
        deleted_at: null,
        utilisateur_id: utilisateur.id,
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
    prisma.commande.findMany({
      where: { deleted_at: null, utilisateur_id: utilisateur.id },
      select: {
        lignes: { where: { deleted_at: null }, select: { prix_net: true } },
        paiements: { select: { montant: true } },
      },
    }),
    prisma.objectif.findUnique({
      where: {
        utilisateur_id_mois: {
          utilisateur_id: utilisateur.id,
          mois: aujourdhuiIso.slice(0, 7),
        },
      },
      select: { montant_objectif: true },
    }),
  ]);

  const kpiMois = calculerKpiPeriode(commandesMois);
  const kpiJour = calculerKpiPeriode(
    filtrerCommandesPeriode(
      commandesMois,
      bornesJour.debutUtc,
      bornesJour.finExclusiveUtc,
    ),
  );
  const impaye = calculerImpayeTotal(commandesImpaye);

  const montantObjectif = objectif ? decimal(objectif.montant_objectif) : null;
  const tauxAtteinte =
    montantObjectif && montantObjectif.gt(0)
      ? kpiMois.chiffreAffaires.mul(100).div(montantObjectif)
      : null;
  const largeurJauge = tauxAtteinte
    ? Math.min(100, Math.max(0, tauxAtteinte.toNumber()))
    : 0;

  const periodeMois = `Du ${formatDate(bornesMois.debutUtc)} au ${formatDate(maintenant.toJSDate())}`;

  return (
    <AppShell
      utilisateur={utilisateur}
      espace="commercial"
      cheminActif="/commercial"
      titre="Tableau de bord"
      description={`Connecté : ${utilisateur.nom_complet} · Rôle : COMMERCIAL`}
    >
      <div className="grid gap-4">
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

        <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <Panel title="Ventes" eyebrow="Raccourcis">
            <div className="grid gap-3 sm:grid-cols-2">
              {raccourcisVentes.map((raccourci) => {
                const Icon = raccourci.icon;
                return (
                  <Link
                    key={raccourci.href}
                    href={raccourci.href}
                    className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-4 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {raccourci.label}
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="Objectif mensuel" eyebrow={aujourdhuiIso.slice(0, 7)}>
            {montantObjectif ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Objectif</span>
                  <span className="font-semibold tabular-nums">
                    {formatMontant(montantObjectif)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Réalisé</span>
                  <span className="font-semibold tabular-nums">
                    {formatMontant(kpiMois.chiffreAffaires)}
                  </span>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span>Taux d&apos;atteinte</span>
                    <span className="font-semibold text-foreground">
                      {tauxAtteinte ? `${tauxAtteinte.toFixed(1)} %` : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${largeurJauge}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun objectif défini pour ce mois. L&apos;administrateur peut en
                fixer un depuis la fiche utilisateur.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
