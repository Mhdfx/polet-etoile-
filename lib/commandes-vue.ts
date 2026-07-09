import { calculerResteDu, sommerMontants, type EntreeDecimal } from "@/lib/decimal";
import { formatMontant } from "@/lib/format";

export type TotauxCommande = {
  total: EntreeDecimal;
  totalPaye: EntreeDecimal;
  resteDu: EntreeDecimal;
  statutPaiement: "paye" | "en_attente";
};

export function calculerTotauxCommande(
  lignes: Array<{ prix_net: EntreeDecimal }>,
  paiements: Array<{ montant: EntreeDecimal }>,
): TotauxCommande {
  const total = sommerMontants(lignes.map((ligne) => ligne.prix_net));
  const totalPaye = sommerMontants(paiements.map((paiement) => paiement.montant));
  const resteDu = calculerResteDu(total, paiements.map((paiement) => paiement.montant));

  return {
    total,
    totalPaye,
    resteDu,
    statutPaiement: resteDu.lte(0) ? "paye" : "en_attente",
  };
}

export function formaterTotauxCommande(totaux: TotauxCommande) {
  return {
    total: formatMontant(totaux.total),
    totalPaye: formatMontant(totaux.totalPaye),
    resteDu: formatMontant(totaux.resteDu),
    statutPaiement: totaux.statutPaiement,
  };
}

export function libelleModePaiement(mode: string): string {
  switch (mode) {
    case "ESPECES":
      return "Especes";
    case "CHEQUE":
      return "Cheque";
    case "TRAITE":
      return "Traite";
    default:
      return "Autre";
  }
}

export function libelleTypeCommande(type: string): string {
  return type === "EXTERNE" ? "Externe" : "Standard";
}
