import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { creerExportJob } from "@/lib/export-jobs";
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

function jsonCourt(valeur: unknown) {
  return valeur ? JSON.stringify(valeur) : "";
}

type AuditExport = Awaited<ReturnType<typeof chargerAuditExport>>[number];

async function chargerAuditExport(where: Prisma.AuditLogWhereInput) {
  return prisma.auditLog.findMany({
    where,
    orderBy: { created_at: "desc" },
    select: {
      created_at: true,
      action: true,
      entite: true,
      entite_id: true,
      donnees_avant: true,
      donnees_apres: true,
      ip_address: true,
      utilisateur: { select: { nom_complet: true, nom_utilisateur: true } },
    },
  });
}

function remplirWorkbook(audits: AuditExport[]) {
  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet("Audit");
  feuille.columns = [
    { header: "Date", key: "date", width: 20 },
    { header: "Utilisateur", key: "utilisateur", width: 32 },
    { header: "Action", key: "action", width: 28 },
    { header: "Entite", key: "entite", width: 24 },
    { header: "Entite ID", key: "entiteId", width: 28 },
    { header: "Avant", key: "avant", width: 50 },
    { header: "Apres", key: "apres", width: 50 },
    { header: "IP", key: "ip", width: 18 },
  ];

  for (const audit of audits) {
    feuille.addRow({
      date: formatDateHeure(audit.created_at),
      utilisateur: audit.utilisateur
        ? `${audit.utilisateur.nom_complet} (${audit.utilisateur.nom_utilisateur})`
        : "",
      action: audit.action,
      entite: audit.entite,
      entiteId: audit.entite_id ?? "",
      avant: jsonCourt(audit.donnees_avant),
      apres: jsonCourt(audit.donnees_apres),
      ip: audit.ip_address ?? "",
    });
  }

  feuille.getRow(1).font = { bold: true };
  return workbook;
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);

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

  const where: Prisma.AuditLogWhereInput = {
    ...(url.searchParams.get("utilisateur")
      ? { utilisateur_id: url.searchParams.get("utilisateur")! }
      : {}),
    ...(url.searchParams.get("action")
      ? { action: { contains: url.searchParams.get("action")! } }
      : {}),
    ...(url.searchParams.get("entite")
      ? { entite: { contains: url.searchParams.get("entite")! } }
      : {}),
    ...(bornes ? { created_at: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
  };

  const filename = `audit_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const total = await prisma.auditLog.count({ where });

  if (total > 5000) {
    const job = await creerExportJob(filename, async (filePath) => {
      const audits = await chargerAuditExport(where);
      const workbook = remplirWorkbook(audits);
      await workbook.xlsx.writeFile(filePath);
    });

    return Response.json(
      {
        status: "pending",
        message: "Export audit volumineux lance en arriere-plan.",
        downloadUrl: job.url,
      },
      { status: 202 },
    );
  }

  const audits = await chargerAuditExport(where);
  const workbook = remplirWorkbook(audits);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
