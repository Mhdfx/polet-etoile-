import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { calculerTotauxCommande, libelleStatutPaiement } from "@/lib/commandes-vue";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { creerExportJob } from "@/lib/export-jobs";
import { formatDateHeure, formatMontant } from "@/lib/format";
import { requireCommercial } from "@/lib/session";

type CommandeExport = Awaited<ReturnType<typeof chargerCommandesExport>>[number];

async function chargerCommandesExport(where: Prisma.CommandeWhereInput) {
  return prisma.commande.findMany({
    where,
    orderBy: { date_commande: "desc" },
    select: {
      numero_bl: true,
      date_commande: true,
      client: { select: { nom: true } },
      client_externe: { select: { nom: true } },
      lignes: { where: { deleted_at: null }, select: { prix_net: true } },
      paiements: { select: { montant: true } },
    },
  });
}

function remplirWorkbook(commandes: CommandeExport[], statut: "paye" | "en_attente" | undefined) {
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
      client: commande.client?.nom ?? commande.client_externe?.nom ?? "-",
      total: formatMontant(totaux.total),
      paye: formatMontant(totaux.totalPaye),
      reste: formatMontant(totaux.resteDu),
      statut: libelleStatutPaiement(totaux.statutPaiement),
    });
  }

  feuille.getRow(1).font = { bold: true };
  return workbook;
}

export async function GET(request: Request) {
  const commercial = await requireCommercial();
  const url = new URL(request.url);
  const recherche = (url.searchParams.get("q") ?? "").trim();
  const statutParam = url.searchParams.get("statut");
  const typeParam = url.searchParams.get("type");
  const type = typeParam === "EXTERNE" || typeParam === "STANDARD" ? typeParam : undefined;
  const clientsExternes = (url.searchParams.get("clients") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
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
      return new Response(
        "Periode invalide : la date fin doit etre egale ou posterieure a la date debut.",
        { status: 400 },
      );
    }
  }

  const where: Prisma.CommandeWhereInput = {
    utilisateur_id: commercial.id,
    deleted_at: null,
    ...(type ? { type_commande: type } : {}),
    ...(clientsExternes.length > 0 ? { client_externe_id: { in: clientsExternes } } : {}),
    ...(bornes ? { date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
    ...(recherche
      ? {
          OR: [
            { numero_bl: { contains: recherche } },
            { client: { nom: { contains: recherche } } },
            { client_externe: { nom: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const filename = `${
    type === "EXTERNE" ? "commandes_externes" : "mes_commandes"
  }_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const totalBrut = await prisma.commande.count({ where });
  if (totalBrut > 5000) {
    const job = await creerExportJob(filename, async (filePath) => {
      const commandes = await chargerCommandesExport(where);
      const workbook = remplirWorkbook(commandes, statut);
      await workbook.xlsx.writeFile(filePath);
    });

    return Response.json(
      {
        status: "pending",
        message: "Export volumineux lance en arriere-plan.",
        downloadUrl: job.url,
      },
      { status: 202 },
    );
  }

  const commandes = await chargerCommandesExport(where);
  const workbook = remplirWorkbook(commandes, statut);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
