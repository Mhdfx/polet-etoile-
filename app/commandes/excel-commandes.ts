import ExcelJS from "exceljs";
import Decimal from "decimal.js";
import {
  calculerTotauxCommande,
  libelleStatutPaiement,
  libelleTypeCommande,
} from "@/lib/commandes-vue";
import type { EntreeDecimal } from "@/lib/decimal";
import { formatDateHeure } from "@/lib/format";

const FORMAT_MONTANT_EXCEL = '#,##0.00 "DH"';

export type CommandeExportExcel = {
  numero_bl: string;
  date_commande: Date;
  type_commande?: string;
  client: { nom: string } | null;
  client_externe: { nom: string } | null;
  utilisateur?: { nom_complet: string };
  lignes: Array<{ prix_net: string | Decimal }>;
  paiements: Array<{ montant: string | Decimal }>;
};

function montantExcel(valeur: EntreeDecimal): number {
  // Frontiere de serialisation Excel uniquement : tous les calculs metier ont
  // deja ete effectues en Decimal. Decimal(10,2) reste dans la plage exacte
  // utile d'Excel et le format de cellule restitue toujours deux decimales.
  return Number(new Decimal(valeur).toFixed(2));
}

export function remplirWorkbookCommandes({
  commandes,
  statut,
  portee,
}: {
  commandes: CommandeExportExcel[];
  statut: "paye" | "en_attente" | undefined;
  portee: "admin" | "commercial";
}): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet(
    portee === "admin" ? "Commandes" : "Mes commandes",
  );
  feuille.columns = [
    { header: "Numero BL", key: "numero", width: 18 },
    { header: "Date", key: "date", width: 18 },
    { header: "Client", key: "client", width: 28 },
    ...(portee === "admin"
      ? [
          { header: "Commercial", key: "commercial", width: 28 },
          { header: "Type", key: "type", width: 12 },
        ]
      : []),
    { header: "Total", key: "total", width: 16 },
    { header: "Paye", key: "paye", width: 16 },
    { header: "Reste", key: "reste", width: 16 },
    { header: "Statut", key: "statut", width: 14 },
  ];

  for (const commande of commandes) {
    const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);
    if (statut && totaux.statutPaiement !== statut) {
      continue;
    }

    feuille.addRow({
      numero: commande.numero_bl,
      date: formatDateHeure(commande.date_commande),
      client: commande.client?.nom ?? commande.client_externe?.nom ?? "-",
      ...(portee === "admin"
        ? {
            commercial: commande.utilisateur?.nom_complet ?? "-",
            type: libelleTypeCommande(commande.type_commande ?? "STANDARD"),
          }
        : {}),
      total: montantExcel(totaux.total),
      paye: montantExcel(totaux.totalPaye),
      reste: montantExcel(totaux.resteDu),
      statut: libelleStatutPaiement(totaux.statutPaiement),
    });
  }

  feuille.getRow(1).font = { bold: true };
  for (const cle of ["total", "paye", "reste"]) {
    feuille.getColumn(cle).numFmt = FORMAT_MONTANT_EXCEL;
  }

  return workbook;
}
