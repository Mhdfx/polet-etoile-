import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { calculerTotauxCommande } from "@/lib/commandes-vue";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDateHeure, formatMontant } from "@/lib/format";
import { requireCommercial } from "@/lib/session";

export async function GET(request: Request) {
  const commercial = await requireCommercial();
  const url = new URL(request.url);
  const recherche = (url.searchParams.get("q") ?? "").trim();
  const statutParam = url.searchParams.get("statut");
  const statut =
    statutParam === "paye" || statutParam === "en_attente"
      ? statutParam
      : undefined;

  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;
  const debut = url.searchParams.get("debut");
  const fin = url.searchParams.get("fin");
  if (debut && fin) {
    try {
      bornes = bornesJourneeInclusive(debut, fin);
    } catch {
      bornes = undefined;
    }
  }

  const where: Prisma.CommandeWhereInput = {
    utilisateur_id: commercial.id,
    deleted_at: null,
    ...(bornes ? { date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
    ...(recherche
      ? {
          OR: [
            { numero_bl: { contains: recherche } },
            { client: { nom: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const commandes = await prisma.commande.findMany({
    where,
    orderBy: { date_commande: "desc" },
    take: 5000,
    select: {
      numero_bl: true,
      date_commande: true,
      client: { select: { nom: true } },
      lignes: { where: { deleted_at: null }, select: { prix_net: true } },
      paiements: { select: { montant: true } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Mes commandes");
  feuille.columns = [
    { header: "Numero BL", key: "numero", width: 18 },
    { header: "Date", key: "date", width: 18 },
    { header: "Client", key: "client", width: 28 },
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
      client: commande.client?.nom ?? "-",
      total: formatMontant(totaux.total),
      paye: formatMontant(totaux.totalPaye),
      reste: formatMontant(totaux.resteDu),
      statut: totaux.statutPaiement === "paye" ? "Paye" : "En attente",
    });
  }

  feuille.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="mes-commandes.xlsx"',
    },
  });
}
