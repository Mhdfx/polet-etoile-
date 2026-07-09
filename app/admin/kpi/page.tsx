import Link from "next/link";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
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
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatMontant, formatQuantite } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import {
  GraphiqueAireCA,
  GraphiqueBarresCommerciaux,
  GraphiqueDonutPaiement,
} from "./kpi-charts";

type ParametresRecherche = Promise<{
  debut?: string;
  fin?: string;
  commercial?: string;
  client?: string;
}>;

type CommandeKpi = {
  id: string;
  date_commande: Date;
  utilisateur: { id: string; nom_complet: string };
  client: { id: string; nom: string } | null;
  client_externe: { id: string; nom: string } | null;
  lignes: Array<{
    quantite: Decimal;
    prix_net: Decimal;
    produit: { id: string; nom: string };
  }>;
  paiements: Array<{ montant: Decimal }>;
};

function periodeParDefaut() {
  const maintenant = DateTime.now().setZone(FUSEAU_APPLICATION);
  return {
    debut: maintenant.startOf("year").toISODate()!,
    fin: maintenant.toISODate()!,
  };
}

function totalCommande(commande: CommandeKpi) {
  return commande.lignes.reduce((total, ligne) => total.plus(ligne.prix_net), new Decimal(0));
}

function totalQuantite(commande: CommandeKpi) {
  return commande.lignes.reduce((total, ligne) => total.plus(ligne.quantite), new Decimal(0));
}

function totalPaiements(commande: CommandeKpi) {
  return commande.paiements.reduce((total, paiement) => total.plus(paiement.montant), new Decimal(0));
}

function resteCommande(commande: CommandeKpi) {
  return Decimal.max(new Decimal(0), totalCommande(commande).minus(totalPaiements(commande)));
}

function ajouterDecimal(map: Map<string, Decimal>, cle: string, montant: Decimal) {
  map.set(cle, (map.get(cle) ?? new Decimal(0)).plus(montant));
}

function montantGraphique(valeur: Decimal) {
  return Number(valeur.toFixed(2));
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
  const clientFiltre = params.client || undefined;
  let erreurPeriode: string | undefined;
  let bornes = bornesJourneeInclusive(defaut.debut, defaut.fin);
  try {
    bornes = bornesJourneeInclusive(debut, fin);
  } catch {
    erreurPeriode = "La date fin doit etre posterieure a la date debut.";
  }

  const filtreClient: Prisma.CommandeWhereInput =
    clientFiltre?.startsWith("client:")
      ? { client_id: clientFiltre.slice("client:".length) }
      : clientFiltre?.startsWith("externe:")
        ? { client_externe_id: clientFiltre.slice("externe:".length) }
        : {};

  const whereCommun: Prisma.CommandeWhereInput = {
    deleted_at: null,
    ...(commercial ? { utilisateur_id: commercial } : {}),
    ...filtreClient,
  };
  const selectCommande = {
    id: true,
    date_commande: true,
    utilisateur: { select: { id: true, nom_complet: true } },
    client: { select: { id: true, nom: true } },
    client_externe: { select: { id: true, nom: true } },
    lignes: {
      where: { deleted_at: null },
      select: {
        quantite: true,
        prix_net: true,
        produit: { select: { id: true, nom: true } },
      },
    },
    paiements: { select: { montant: true } },
  } satisfies Prisma.CommandeSelect;

  const [commandes, commandesCumulees, commerciaux, clients, clientsExternes] = await Promise.all([
    prisma.commande.findMany({
      where: {
        ...whereCommun,
        date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc },
      },
      orderBy: { date_commande: "asc" },
      select: selectCommande,
    }),
    prisma.commande.findMany({
      where: whereCommun,
      orderBy: { date_commande: "asc" },
      select: selectCommande,
    }),
    prisma.user.findMany({
      where: { role: "COMMERCIAL", deleted_at: null },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
    prisma.client.findMany({
      where: { deleted_at: null },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
    prisma.clientExterne.findMany({
      where: { deleted_at: null },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
  ]);

  const caPeriode = commandes.reduce((total, commande) => total.plus(totalCommande(commande)), new Decimal(0));
  const reglePeriode = commandes.reduce((total, commande) => total.plus(totalPaiements(commande)), new Decimal(0));
  const nonReglePeriode = commandes.reduce((total, commande) => total.plus(resteCommande(commande)), new Decimal(0));
  const quantitePeriode = commandes.reduce((total, commande) => total.plus(totalQuantite(commande)), new Decimal(0));
  const prixMoyen = quantitePeriode.gt(0) ? caPeriode.div(quantitePeriode) : null;
  const clientsDistincts = new Set(commandes.map((commande) => commande.client?.id ?? `externe:${commande.client_externe?.id}`).filter(Boolean));

  const caCumule = commandesCumulees.reduce((total, commande) => total.plus(totalCommande(commande)), new Decimal(0));
  const regleCumule = commandesCumulees.reduce((total, commande) => total.plus(totalPaiements(commande)), new Decimal(0));
  const nonRegleCumule = commandesCumulees.reduce((total, commande) => total.plus(resteCommande(commande)), new Decimal(0));

  const caParJour = new Map<string, Decimal>();
  const caParCommercial = new Map<string, Decimal>();
  const kpiCommercial = new Map<string, { ca: Decimal; regle: Decimal; nonRegle: Decimal }>();
  const topClients = new Map<string, { id: string; externe: boolean; qte: Decimal; ca: Decimal }>();
  const topProduits = new Map<string, { qte: Decimal; ca: Decimal }>();
  const financiers = new Map<string, { id: string; externe: boolean; commercial: string; ca: Decimal; nonRegle: Decimal }>();

  for (const commande of commandes) {
    const ca = totalCommande(commande);
    const regle = totalPaiements(commande);
    const nonRegle = resteCommande(commande);
    const jour = DateTime.fromJSDate(commande.date_commande).setZone(FUSEAU_APPLICATION).toFormat("dd/MM");
    ajouterDecimal(caParJour, jour, ca);
    ajouterDecimal(caParCommercial, commande.utilisateur.nom_complet, ca);
    const ligneCommercial = kpiCommercial.get(commande.utilisateur.nom_complet) ?? {
      ca: new Decimal(0),
      regle: new Decimal(0),
      nonRegle: new Decimal(0),
    };
    ligneCommercial.ca = ligneCommercial.ca.plus(ca);
    ligneCommercial.regle = ligneCommercial.regle.plus(regle);
    ligneCommercial.nonRegle = ligneCommercial.nonRegle.plus(nonRegle);
    kpiCommercial.set(commande.utilisateur.nom_complet, ligneCommercial);

    const client = commande.client ?? commande.client_externe;
    if (client) {
      const cleClient = `${commande.client ? "client" : "externe"}:${client.id}`;
      const entreeClient = topClients.get(cleClient) ?? {
        id: client.id,
        externe: !commande.client,
        qte: new Decimal(0),
        ca: new Decimal(0),
      };
      entreeClient.qte = entreeClient.qte.plus(totalQuantite(commande));
      entreeClient.ca = entreeClient.ca.plus(ca);
      topClients.set(cleClient, entreeClient);

      const entreeFinanciere = financiers.get(cleClient) ?? {
        id: client.id,
        externe: !commande.client,
        commercial: commande.utilisateur.nom_complet,
        ca: new Decimal(0),
        nonRegle: new Decimal(0),
      };
      entreeFinanciere.ca = entreeFinanciere.ca.plus(ca);
      entreeFinanciere.nonRegle = entreeFinanciere.nonRegle.plus(nonRegle);
      financiers.set(cleClient, entreeFinanciere);
    }

    for (const ligne of commande.lignes) {
      const entreeProduit = topProduits.get(ligne.produit.nom) ?? {
        qte: new Decimal(0),
        ca: new Decimal(0),
      };
      entreeProduit.qte = entreeProduit.qte.plus(ligne.quantite);
      entreeProduit.ca = entreeProduit.ca.plus(ligne.prix_net);
      topProduits.set(ligne.produit.nom, entreeProduit);
    }
  }

  const evolutionMois = Array.from({ length: 3 }).map((_, index) =>
    DateTime.now().setZone(FUSEAU_APPLICATION).minus({ months: index }).toFormat("yyyy-MM"),
  );
  const evolution = new Map<string, Record<string, Decimal>>();
  for (const commande of commandesCumulees) {
    const mois = DateTime.fromJSDate(commande.date_commande).setZone(FUSEAU_APPLICATION).toFormat("yyyy-MM");
    if (!evolutionMois.includes(mois)) {
      continue;
    }
    const ligne = evolution.get(commande.utilisateur.nom_complet) ?? {};
    ligne[mois] = (ligne[mois] ?? new Decimal(0)).plus(totalCommande(commande));
    evolution.set(commande.utilisateur.nom_complet, ligne);
  }

  const totalKpiCommercial = [...kpiCommercial.values()].reduce(
    (total, ligne) => ({
      ca: total.ca.plus(ligne.ca),
      regle: total.regle.plus(ligne.regle),
      nonRegle: total.nonRegle.plus(ligne.nonRegle),
    }),
    { ca: new Decimal(0), regle: new Decimal(0), nonRegle: new Decimal(0) },
  );

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/kpi"
      titre="Audit KPIs"
      description="Indicateurs consolides : periode, cumul, graphiques, clients, produits et commerciaux."
    >
      <div className="grid gap-5">
        <form className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
          <div className="grid gap-1.5">
            <Label htmlFor="kpi-debut">Date debut</Label>
            <Input id="kpi-debut" name="debut" type="date" defaultValue={debut} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kpi-fin">Date fin</Label>
            <Input id="kpi-fin" name="fin" type="date" defaultValue={fin} />
          </div>
          <div className="grid min-w-44 gap-1.5">
            <Label htmlFor="kpi-commercial">Commercial</Label>
            <SelectNatif id="kpi-commercial" name="commercial" defaultValue={commercial ?? ""}>
              <option value="">Tous les commerciaux</option>
              {commerciaux.map((item) => (
                <option key={item.id} value={item.id}>{item.nom_complet}</option>
              ))}
            </SelectNatif>
          </div>
          <div className="grid min-w-52 gap-1.5">
            <Label htmlFor="kpi-client">Client</Label>
            <SelectNatif id="kpi-client" name="client" defaultValue={clientFiltre ?? ""}>
              <option value="">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={`client:${client.id}`}>{client.nom}</option>
              ))}
              {clientsExternes.map((client) => (
                <option key={client.id} value={`externe:${client.id}`}>{client.nom} (externe)</option>
              ))}
            </SelectNatif>
          </div>
          <Bouton type="submit">Filtrer</Bouton>
        </form>
        {erreurPeriode ? <p className="text-sm text-destructive">{erreurPeriode}</p> : null}

        <p className="rounded-lg bg-card p-3 text-xs text-muted-foreground ring-1 ring-border">
          Formules : CA = somme des prix nets lignes commande. Regle = somme des paiements. Non regle = max(CA - paiements, 0). Prix moyen = CA / quantite KG. Les filtres de dates sont inclusifs jusqu&apos;a la fin de journee Casablanca.
        </p>

        <div className="grid gap-4 md:grid-cols-5">
          <CarteKPI label="CA periode" valeur={formatMontant(caPeriode)} tonalite="bleu" />
          <CarteKPI label="Regle periode" valeur={formatMontant(reglePeriode)} tonalite="vert" />
          <CarteKPI label="Non regle periode" valeur={formatMontant(nonReglePeriode)} tonalite="rouge" />
          <CarteKPI label="Clients" valeur={String(clientsDistincts.size)} tonalite="neutre" />
          <CarteKPI label="Prix moyen" valeur={prixMoyen ? formatMontant(prixMoyen) : "-"} tonalite="neutre" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <CarteKPI label="Quantite periode" valeur={formatQuantite(quantitePeriode)} tonalite="bleu" />
          <CarteKPI label="CA cumule" valeur={formatMontant(caCumule)} tonalite="bleu" />
          <CarteKPI label="Regle cumule" valeur={formatMontant(regleCumule)} tonalite="vert" />
          <CarteKPI label="Non regle cumule" valeur={formatMontant(nonRegleCumule)} tonalite="rouge" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Bloc titre="CA par jour"><GraphiqueAireCA donnees={[...caParJour.entries()].map(([label, valeur]) => ({ label, valeur: montantGraphique(valeur) }))} /></Bloc>
          <Bloc titre="Regle vs non regle"><GraphiqueDonutPaiement donnees={[{ label: "Regle", valeur: montantGraphique(reglePeriode) }, { label: "Non regle", valeur: montantGraphique(nonReglePeriode) }]} /></Bloc>
          <Bloc titre="CA par commercial"><GraphiqueBarresCommerciaux donnees={[...caParCommercial.entries()].map(([label, valeur]) => ({ label, valeur: montantGraphique(valeur) }))} /></Bloc>
        </div>

        <Bloc titre="KPI Commercial - Periode">
          <Table>
            <TableHeader><TableRow><TableHead>Commercial</TableHead><TableHead className="text-right">CA</TableHead><TableHead className="text-right">Regle</TableHead><TableHead className="text-right">Non regle</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...kpiCommercial.entries()].map(([nom, ligne]) => (
                <TableRow key={nom}><TableCell>{nom}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(ligne.ca)}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(ligne.regle)}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(ligne.nonRegle)}</TableCell></TableRow>
              ))}
              <TableRow className="font-semibold"><TableCell>TOTAL</TableCell><TableCell className="text-right tabular-nums">{formatMontant(totalKpiCommercial.ca)}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(totalKpiCommercial.regle)}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(totalKpiCommercial.nonRegle)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </Bloc>

        <div className="grid gap-4 xl:grid-cols-2">
          <Bloc titre="Top 10 clients - CA">
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Qte</TableHead><TableHead className="text-right">CA</TableHead></TableRow></TableHeader>
              <TableBody>{[...topClients.entries()].sort((a, b) => b[1].ca.comparedTo(a[1].ca)).slice(0, 10).map(([cle, ligne]) => (
                <TableRow key={cle}><TableCell><Link className="text-primary hover:underline" href={ligne.externe ? `/admin/clients/externes/${ligne.id}` : `/admin/clients/${ligne.id}`}>{clients.find((c) => c.id === ligne.id)?.nom ?? clientsExternes.find((c) => c.id === ligne.id)?.nom ?? "Client"}</Link></TableCell><TableCell className="text-right tabular-nums">{formatQuantite(ligne.qte)}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(ligne.ca)}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </Bloc>

          <Bloc titre="Top 10 produits">
            <Table>
              <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Qte</TableHead><TableHead className="text-right">CA</TableHead><TableHead className="text-right">Prix moyen</TableHead></TableRow></TableHeader>
              <TableBody>{[...topProduits.entries()].sort((a, b) => b[1].qte.comparedTo(a[1].qte)).slice(0, 10).map(([nom, ligne]) => (
                <TableRow key={nom}><TableCell>{nom}</TableCell><TableCell className="text-right tabular-nums">{formatQuantite(ligne.qte)}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(ligne.ca)}</TableCell><TableCell className="text-right tabular-nums">{ligne.qte.gt(0) ? formatMontant(ligne.ca.div(ligne.qte)) : "-"}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </Bloc>
        </div>

        <Bloc titre="KPI Financiers - Clients (Non regle)">
          <Table>
            <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Commercial</TableHead><TableHead className="text-right">CA</TableHead><TableHead className="text-right">% Non regle</TableHead></TableRow></TableHeader>
            <TableBody>{[...financiers.entries()].filter(([, ligne]) => ligne.nonRegle.gt(0)).sort((a, b) => b[1].nonRegle.comparedTo(a[1].nonRegle)).map(([cle, ligne]) => (
              <TableRow key={cle}><TableCell><Link className="text-primary hover:underline" href={ligne.externe ? `/admin/clients/externes/${ligne.id}` : `/admin/clients/${ligne.id}`}>{clients.find((c) => c.id === ligne.id)?.nom ?? clientsExternes.find((c) => c.id === ligne.id)?.nom ?? "Client"}</Link></TableCell><TableCell>{ligne.commercial}</TableCell><TableCell className="text-right tabular-nums">{formatMontant(ligne.ca)}</TableCell><TableCell className="text-right tabular-nums">{ligne.ca.gt(0) ? `${ligne.nonRegle.mul(100).div(ligne.ca).toFixed(1)} %` : "-"}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </Bloc>

        <Bloc titre="Evolution CA (mois courant / M-1 / M-2)">
          <Table>
            <TableHeader><TableRow><TableHead>Commercial</TableHead>{evolutionMois.map((mois) => <TableHead key={mois} className="text-right">{mois}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{[...evolution.entries()].map(([nom, ligne]) => (
              <TableRow key={nom}><TableCell>{nom}</TableCell>{evolutionMois.map((mois) => <TableCell key={mois} className="text-right tabular-nums">{formatMontant(ligne[mois] ?? new Decimal(0))}</TableCell>)}</TableRow>
            ))}</TableBody>
          </Table>
        </Bloc>
      </div>
    </AppShell>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold">{titre}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
