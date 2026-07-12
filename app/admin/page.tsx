import Link from "next/link";
import Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  History,
  MapPin,
  Package,
  Scale,
  Settings,
  Target,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { AppShell, Panel } from "@/components/app-shell";
import { CarteKPI } from "@/components/carte-kpi";
import { Bouton } from "@/components/bouton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { calculerResteDu, sommerMontants, sommerQuantites } from "@/lib/decimal";
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
  {
    label: "Historique admins",
    href: "/admin/historique-admins",
    icon: History,
  },
  { label: "Sessions actives", href: "/admin/sessions", icon: UserCog },
  { label: "Toutes les commandes", href: "/admin/commandes", icon: ClipboardList },
  { label: "Audit KPIs", href: "/admin/kpi", icon: BarChart3 },
];

type LigneClassement = {
  cle: string;
  label: string;
  detail?: string;
  ca: Decimal;
  quantite: Decimal;
  commandes: Set<string>;
  reste: Decimal;
};

function nouvelleLigneClassement(
  cle: string,
  label: string,
  detail?: string,
): LigneClassement {
  return {
    cle,
    label,
    detail,
    ca: new Decimal(0),
    quantite: new Decimal(0),
    commandes: new Set<string>(),
    reste: new Decimal(0),
  };
}

function topClassement(
  map: Map<string, LigneClassement>,
  tri: "ca" | "quantite" | "commandes" | "reste" = "ca",
  limite = 5,
): LigneClassement[] {
  return [...map.values()]
    .sort((a, b) => {
      if (tri === "commandes") {
        return b.commandes.size - a.commandes.size;
      }

      return b[tri].cmp(a[tri]);
    })
    .slice(0, limite);
}

function RankingPanel({
  title,
  eyebrow,
  lignes,
  valeur,
  icon: Icon,
}: {
  title: string;
  eyebrow: string;
  lignes: LigneClassement[];
  valeur: "ca" | "quantite" | "commandes" | "reste";
  icon: typeof Trophy;
}) {
  return (
    <Panel title={title} eyebrow={eyebrow}>
      <div className="grid gap-2">
        {lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée sur cette période.</p>
        ) : (
          lignes.map((ligne, index) => (
            <div
              key={ligne.cle}
              className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-md border border-border bg-background/60 px-3 py-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{ligne.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ligne.detail ?? `${ligne.commandes.size} BL`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <Icon className="hidden h-4 w-4 text-primary sm:block" />
                <p className="text-sm font-semibold tabular-nums">
                  {valeur === "ca"
                    ? formatMontant(ligne.ca)
                    : valeur === "quantite"
                      ? formatQuantite(ligne.quantite)
                      : valeur === "reste"
                        ? formatMontant(ligne.reste)
                        : ligne.commandes.size}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

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
              id: true,
              date_commande: true,
              utilisateur: { select: { id: true, nom_complet: true, nom_utilisateur: true } },
              client: { select: { id: true, nom: true, region_ville: true } },
              client_externe: { select: { id: true, nom: true, region_ville: true } },
              lignes: {
                where: { deleted_at: null },
                select: {
                  prix_net: true,
                  quantite: true,
                  produit: { select: { id: true, nom: true, categorie: true } },
                },
              },
              paiements: { select: { montant: true } },
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
  const classementCommerciaux = new Map<string, LigneClassement>();
  const classementProduits = new Map<string, LigneClassement>();
  const classementVilles = new Map<string, LigneClassement>();
  const classementClients = new Map<string, LigneClassement>();
  const classementRisquePaiement = new Map<string, LigneClassement>();

  for (const commande of commandesPeriode) {
    const totalCommande = sommerMontants(
      commande.lignes.map((ligne) => ligne.prix_net),
    );
    const quantiteCommande = sommerQuantites(
      commande.lignes.map((ligne) => ligne.quantite),
    );
    const resteCommande = calculerResteDu(
      totalCommande,
      commande.paiements.map((paiement) => paiement.montant),
    );
    const clientCommande = commande.client ?? commande.client_externe;
    const cleClient = clientCommande
      ? `${commande.client ? "client" : "externe"}:${clientCommande.id}`
      : "client:inconnu";
    const nomClient = clientCommande?.nom ?? "Client inconnu";
    const ville = clientCommande?.region_ville ?? "Ville non renseignee";
    const commercialLabel = `${commande.utilisateur.nom_complet} (${commande.utilisateur.nom_utilisateur})`;

    const ligneCommercial =
      classementCommerciaux.get(commande.utilisateur.id) ??
      nouvelleLigneClassement(commande.utilisateur.id, commercialLabel);
    ligneCommercial.ca = ligneCommercial.ca.plus(totalCommande);
    ligneCommercial.quantite = ligneCommercial.quantite.plus(quantiteCommande);
    ligneCommercial.commandes.add(commande.id);
    ligneCommercial.reste = ligneCommercial.reste.plus(resteCommande);
    classementCommerciaux.set(commande.utilisateur.id, ligneCommercial);

    const ligneVille =
      classementVilles.get(ville) ?? nouvelleLigneClassement(ville, ville);
    ligneVille.ca = ligneVille.ca.plus(totalCommande);
    ligneVille.quantite = ligneVille.quantite.plus(quantiteCommande);
    ligneVille.commandes.add(commande.id);
    ligneVille.reste = ligneVille.reste.plus(resteCommande);
    classementVilles.set(ville, ligneVille);

    const ligneClient =
      classementClients.get(cleClient) ??
      nouvelleLigneClassement(cleClient, nomClient, ville);
    ligneClient.ca = ligneClient.ca.plus(totalCommande);
    ligneClient.quantite = ligneClient.quantite.plus(quantiteCommande);
    ligneClient.commandes.add(commande.id);
    ligneClient.reste = ligneClient.reste.plus(resteCommande);
    classementClients.set(cleClient, ligneClient);
    classementRisquePaiement.set(cleClient, ligneClient);

    for (const ligne of commande.lignes) {
      const cleProduit = ligne.produit.id;
      const ligneProduit =
        classementProduits.get(cleProduit) ??
        nouvelleLigneClassement(cleProduit, ligne.produit.nom, ligne.produit.categorie);
      ligneProduit.ca = ligneProduit.ca.plus(ligne.prix_net);
      ligneProduit.quantite = ligneProduit.quantite.plus(ligne.quantite);
      ligneProduit.commandes.add(commande.id);
      classementProduits.set(cleProduit, ligneProduit);
    }
  }

  const topCommerciaux = topClassement(classementCommerciaux, "ca");
  const topProduits = topClassement(classementProduits, "quantite");
  const topVilles = topClassement(classementVilles, "ca");
  const topClients = topClassement(classementClients, "ca");
  const topRestes = topClassement(classementRisquePaiement, "reste").filter((ligne) =>
    ligne.reste.gt(0),
  );

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

        <section className="grid gap-4 xl:grid-cols-3">
          <RankingPanel
            title="Ranking commerciaux"
            eyebrow="Top CA sur la periode"
            lignes={topCommerciaux}
            valeur="ca"
            icon={Trophy}
          />
          <RankingPanel
            title="Best sellers produits"
            eyebrow="Top volumes vendus"
            lignes={topProduits}
            valeur="quantite"
            icon={Package}
          />
          <RankingPanel
            title="Villes les plus fortes"
            eyebrow="Top CA par ville"
            lignes={topVilles}
            valeur="ca"
            icon={MapPin}
          />
          <RankingPanel
            title="Meilleurs clients"
            eyebrow="Top CA client"
            lignes={topClients}
            valeur="ca"
            icon={Users}
          />
          <RankingPanel
            title="Clients a encaisser"
            eyebrow="Plus gros restes dus"
            lignes={topRestes}
            valeur="reste"
            icon={AlertTriangle}
          />
        </section>

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
