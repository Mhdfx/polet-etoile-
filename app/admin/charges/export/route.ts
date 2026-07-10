import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { arrondirQuantite, sommerQuantites } from "@/lib/decimal";
import { creerExportJob } from "@/lib/export-jobs";
import { formatDate } from "@/lib/format";
import { entetesFichierPrive, entetesReponsePrivee } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

type BonChargeExport = Awaited<ReturnType<typeof chargerChargesExport>>[number];

async function chargerChargesExport(where: Prisma.BonChargeWhereInput) {
  return prisma.bonCharge.findMany({
    where,
    orderBy: { date_charge: "desc" },
    select: {
      numero_bc: true,
      date_charge: true,
      commercial: { select: { nom_complet: true } },
      createur: { select: { nom_complet: true } },
      lignes: {
        where: { deleted_at: null },
        orderBy: { produit: { ordre_affichage: "asc" } },
        select: { quantite_kg: true, produit: { select: { nom: true } } },
      },
    },
  });
}

function remplirWorkbook(bons: BonChargeExport[]) {
  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Bons de charge");
  feuille.columns = [
    { header: "Numero BC", key: "numero", width: 16 },
    { header: "Date tournee", key: "date", width: 16 },
    { header: "Commercial", key: "commercial", width: 28 },
    { header: "Produit", key: "produit", width: 30 },
    { header: "Quantite (kg)", key: "quantite", width: 16 },
    { header: "Saisi par", key: "createur", width: 24 },
  ];

  const toutesQuantites: string[] = [];

  for (const bon of bons) {
    for (const ligne of bon.lignes) {
      const quantite = arrondirQuantite(ligne.quantite_kg);
      toutesQuantites.push(quantite.toFixed(3));
      const row = feuille.addRow({
        numero: bon.numero_bc,
        date: formatDate(bon.date_charge),
        commercial: bon.commercial.nom_complet,
        produit: ligne.produit.nom,
        quantite: Number(quantite.toFixed(3)),
        createur: bon.createur.nom_complet,
      });
      row.getCell("quantite").numFmt = "0.000";
    }
  }

  const totalRow = feuille.addRow({
    produit: "TOTAL",
    quantite: Number(sommerQuantites(toutesQuantites).toFixed(3)),
  });
  totalRow.getCell("quantite").numFmt = "0.000";
  totalRow.font = { bold: true };

  feuille.getRow(1).font = { bold: true };
  return workbook;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  const url = new URL(request.url);
  const recherche = (url.searchParams.get("q") ?? "").trim();
  const commercial = url.searchParams.get("commercial") || undefined;

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

  const where: Prisma.BonChargeWhereInput = {
    deleted_at: null,
    ...(commercial ? { commercial_id: commercial } : {}),
    ...(bornes ? { date_charge: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
    ...(recherche
      ? {
          OR: [
            { numero_bc: { contains: recherche } },
            { commercial: { nom_complet: { contains: recherche } } },
            { lignes: { some: { produit: { nom: { contains: recherche } } } } },
          ],
        }
      : {}),
  };

  const filename = `bons_charge_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Seuil sur le nombre de lignes exportées (une ligne = un produit chargé).
  const totalLignes = await prisma.ligneBonCharge.count({
    where: { deleted_at: null, bon_charge: where },
  });

  if (totalLignes > 5000) {
    const job = await creerExportJob(
      filename,
      { utilisateurId: admin.id, access: "ADMIN" },
      async (filePath) => {
        const bons = await chargerChargesExport(where);
        const workbook = remplirWorkbook(bons);
        await workbook.xlsx.writeFile(filePath);
      },
    );

    return Response.json(
      {
        status: "pending",
        message: "Export volumineux lance en arriere-plan.",
        downloadUrl: job.url,
      },
      { status: 202, headers: entetesReponsePrivee },
    );
  }

  const bons = await chargerChargesExport(where);
  const workbook = remplirWorkbook(bons);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    headers: entetesFichierPrive(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `attachment; filename="${filename}"`,
    ),
  });
}
