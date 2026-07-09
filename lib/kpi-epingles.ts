import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatMontant, formatQuantite } from "@/lib/format";

// CDC 6.5.3 : les cartes KPI de l'ecran Audit KPIs peuvent etre epinglees au
// tableau de bord principal. La selection est stockee dans parametres_systeme
// (cle `kpi_epingles`, JSON array de cles ci-dessous).
export const CLE_PARAMETRE_EPINGLES = "kpi_epingles";

export const CARTES_KPI_EPINGLABLES = {
  ca_periode: { label: "CA periode", tonalite: "bleu" },
  regle_periode: { label: "Regle periode", tonalite: "vert" },
  non_regle_periode: { label: "Non regle periode", tonalite: "rouge" },
  clients_periode: { label: "Clients", tonalite: "neutre" },
  prix_moyen: { label: "Prix moyen", tonalite: "neutre" },
  quantite_periode: { label: "Quantite periode", tonalite: "bleu" },
  ca_cumule: { label: "CA cumule", tonalite: "bleu" },
  regle_cumule: { label: "Regle cumule", tonalite: "vert" },
  non_regle_cumule: { label: "Non regle cumule", tonalite: "rouge" },
} as const;

export type CleKpiEpinglable = keyof typeof CARTES_KPI_EPINGLABLES;

export function estCleEpinglable(cle: string): cle is CleKpiEpinglable {
  return cle in CARTES_KPI_EPINGLABLES;
}

export async function lireEpinglesKpi(): Promise<CleKpiEpinglable[]> {
  const parametre = await prisma.parametreSysteme.findUnique({
    where: { cle: CLE_PARAMETRE_EPINGLES },
    select: { valeur: true },
  });

  if (!parametre) {
    return [];
  }

  try {
    const brut: unknown = JSON.parse(parametre.valeur);
    if (!Array.isArray(brut)) {
      return [];
    }
    return brut.filter(
      (cle): cle is CleKpiEpinglable => typeof cle === "string" && estCleEpinglable(cle),
    );
  } catch {
    return [];
  }
}

type CommandeEpingles = {
  client_id: string | null;
  client_externe_id: string | null;
  lignes: Array<{ quantite: Decimal; prix_net: Decimal }>;
  paiements: Array<{ montant: Decimal }>;
};

function agreger(commandes: CommandeEpingles[]) {
  let ca = new Decimal(0);
  let regle = new Decimal(0);
  let nonRegle = new Decimal(0);
  let quantite = new Decimal(0);
  const clients = new Set<string>();

  for (const commande of commandes) {
    const total = commande.lignes.reduce(
      (somme, ligne) => somme.plus(ligne.prix_net),
      new Decimal(0),
    );
    const paye = commande.paiements.reduce(
      (somme, paiement) => somme.plus(paiement.montant),
      new Decimal(0),
    );
    ca = ca.plus(total);
    regle = regle.plus(paye);
    nonRegle = nonRegle.plus(Decimal.max(new Decimal(0), total.minus(paye)));
    quantite = commande.lignes.reduce((somme, ligne) => somme.plus(ligne.quantite), quantite);
    const cleClient = commande.client_id ?? (commande.client_externe_id ? `externe:${commande.client_externe_id}` : null);
    if (cleClient) {
      clients.add(cleClient);
    }
  }

  return { ca, regle, nonRegle, quantite, clients: clients.size };
}

export type CarteEpinglee = {
  cle: CleKpiEpinglable;
  label: string;
  valeur: string;
  tonalite: "bleu" | "rouge" | "vert" | "neutre";
  detail: string;
};

/**
 * Calcule les valeurs des cartes epinglees pour le tableau de bord admin.
 * Perimetre : periode par defaut de l'ecran Audit KPIs (1er janvier -> aujourd'hui),
 * tous commerciaux et tous clients, memes formules que l'ecran KPI.
 */
export async function calculerCartesEpinglees(
  cles: CleKpiEpinglable[],
): Promise<CarteEpinglee[]> {
  if (cles.length === 0) {
    return [];
  }

  const maintenant = DateTime.now().setZone(FUSEAU_APPLICATION);
  const debutIso = maintenant.startOf("year").toISODate()!;
  const finIso = maintenant.toISODate()!;
  const bornes = bornesJourneeInclusive(debutIso, finIso);
  const detailPeriode = `Audit KPIs · du 01/01/${maintenant.year} au ${maintenant.toFormat("dd/MM/yyyy")}`;
  const detailCumul = "Audit KPIs · toutes dates";

  const clesPeriode: CleKpiEpinglable[] = [
    "ca_periode",
    "regle_periode",
    "non_regle_periode",
    "clients_periode",
    "prix_moyen",
    "quantite_periode",
  ];
  const besoinPeriode = cles.some((cle) => clesPeriode.includes(cle));
  const besoinCumul = cles.some((cle) => !clesPeriode.includes(cle));

  const selectCommande = {
    client_id: true,
    client_externe_id: true,
    lignes: { where: { deleted_at: null }, select: { quantite: true, prix_net: true } },
    paiements: { select: { montant: true } },
  } as const;

  const [commandesPeriode, commandesCumul] = await Promise.all([
    besoinPeriode
      ? prisma.commande.findMany({
          where: {
            deleted_at: null,
            date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc },
          },
          select: selectCommande,
        })
      : Promise.resolve([]),
    besoinCumul
      ? prisma.commande.findMany({
          where: { deleted_at: null },
          select: selectCommande,
        })
      : Promise.resolve([]),
  ]);

  const periode = agreger(commandesPeriode);
  const cumul = agreger(commandesCumul);

  const valeurs: Record<CleKpiEpinglable, { valeur: string; detail: string }> = {
    ca_periode: { valeur: formatMontant(periode.ca), detail: detailPeriode },
    regle_periode: { valeur: formatMontant(periode.regle), detail: detailPeriode },
    non_regle_periode: { valeur: formatMontant(periode.nonRegle), detail: detailPeriode },
    clients_periode: { valeur: String(periode.clients), detail: detailPeriode },
    prix_moyen: {
      valeur: periode.quantite.gt(0) ? formatMontant(periode.ca.div(periode.quantite)) : "—",
      detail: detailPeriode,
    },
    quantite_periode: { valeur: formatQuantite(periode.quantite), detail: detailPeriode },
    ca_cumule: { valeur: formatMontant(cumul.ca), detail: detailCumul },
    regle_cumule: { valeur: formatMontant(cumul.regle), detail: detailCumul },
    non_regle_cumule: { valeur: formatMontant(cumul.nonRegle), detail: detailCumul },
  };

  return cles.map((cle) => ({
    cle,
    label: CARTES_KPI_EPINGLABLES[cle].label,
    tonalite: CARTES_KPI_EPINGLABLES[cle].tonalite,
    ...valeurs[cle],
  }));
}
