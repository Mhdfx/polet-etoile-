import Decimal from "decimal.js";
import { calculerResteDu, sommerMontants, type EntreeDecimal } from "@/lib/decimal";
import { formatMontant } from "@/lib/format";

export type LigneKpi = {
  prix_net: EntreeDecimal;
  produit?: { nom: string } | null;
};

export type PaiementKpi = {
  montant: EntreeDecimal;
};

export type CommandeKpi = {
  client?: { nom: string } | null;
  client_externe?: { nom: string } | null;
  lignes: LigneKpi[];
  paiements: PaiementKpi[];
};

export type EntreeTop = {
  label: string;
  montant: Decimal;
};

export type KpiCommandes = {
  chiffreAffaires: Decimal;
  nombreCommandes: number;
  montantImpaye: Decimal;
  topClients: EntreeTop[];
  topProduits: EntreeTop[];
};

function ajouterMontant(map: Map<string, Decimal>, cle: string, montant: EntreeDecimal) {
  map.set(cle, (map.get(cle) ?? new Decimal(0)).plus(montant));
}

function trierTop(map: Map<string, Decimal>, limite: number): EntreeTop[] {
  return [...map.entries()]
    .map(([label, montant]) => ({ label, montant }))
    .sort((a, b) => b.montant.comparedTo(a.montant))
    .slice(0, limite);
}

export function calculerKpiCommandes(
  commandes: CommandeKpi[],
  limiteTop = 5,
): KpiCommandes {
  const clients = new Map<string, Decimal>();
  const produits = new Map<string, Decimal>();

  let chiffreAffaires = new Decimal(0);
  let montantImpaye = new Decimal(0);

  for (const commande of commandes) {
    const totalCommande = sommerMontants(
      commande.lignes.map((ligne) => ligne.prix_net),
    );
    chiffreAffaires = chiffreAffaires.plus(totalCommande);

    const reste = calculerResteDu(
      totalCommande,
      commande.paiements.map((paiement) => paiement.montant),
    );
    if (reste.gt(0)) {
      montantImpaye = montantImpaye.plus(reste);
    }

    const client = commande.client?.nom ?? commande.client_externe?.nom ?? "Client inconnu";
    ajouterMontant(clients, client, totalCommande);

    for (const ligne of commande.lignes) {
      ajouterMontant(produits, ligne.produit?.nom ?? "Produit inconnu", ligne.prix_net);
    }
  }

  return {
    chiffreAffaires,
    nombreCommandes: commandes.length,
    montantImpaye,
    topClients: trierTop(clients, limiteTop),
    topProduits: trierTop(produits, limiteTop),
  };
}

export function formaterEntreesTop(entrees: EntreeTop[]) {
  return entrees.map((entree) => ({
    label: entree.label,
    montant: formatMontant(entree.montant),
  }));
}

export type LigneDashboard = {
  prix_net: EntreeDecimal;
  quantite: EntreeDecimal;
};

export type CommandeDashboard = {
  date_commande: Date;
  lignes: LigneDashboard[];
};

export type KpiPeriode = {
  chiffreAffaires: Decimal;
  quantite: Decimal;
  nombreCommandes: number;
};

/** CA + quantite (KG) + nombre de commandes sur un lot de commandes. */
export function calculerKpiPeriode(commandes: CommandeDashboard[]): KpiPeriode {
  let chiffreAffaires = new Decimal(0);
  let quantite = new Decimal(0);

  for (const commande of commandes) {
    for (const ligne of commande.lignes) {
      chiffreAffaires = chiffreAffaires.plus(ligne.prix_net);
      quantite = quantite.plus(ligne.quantite);
    }
  }

  return {
    chiffreAffaires,
    quantite,
    nombreCommandes: commandes.length,
  };
}

/** Ne garde que les commandes dont la date est dans [debut, finExclusive[. */
export function filtrerCommandesPeriode<T extends { date_commande: Date }>(
  commandes: T[],
  debutUtc: Date,
  finExclusiveUtc: Date,
): T[] {
  return commandes.filter(
    (commande) =>
      commande.date_commande >= debutUtc && commande.date_commande < finExclusiveUtc,
  );
}

export type CommandeImpaye = {
  lignes: Array<{ prix_net: EntreeDecimal }>;
  paiements: PaiementKpi[];
};

/** Somme des restes dus (> 0) — le "chiffre non regle" du CDC. */
export function calculerImpayeTotal(commandes: CommandeImpaye[]): Decimal {
  let impaye = new Decimal(0);

  for (const commande of commandes) {
    const total = sommerMontants(commande.lignes.map((ligne) => ligne.prix_net));
    const reste = calculerResteDu(
      total,
      commande.paiements.map((paiement) => paiement.montant),
    );
    if (reste.gt(0)) {
      impaye = impaye.plus(reste);
    }
  }

  return impaye;
}
