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
