import ExcelJS from "exceljs";
import type { Prisma, RoleUtilisateur } from "@prisma/client";
import { construireFiltreAudit } from "@/lib/audit-filters";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { creerExportJob } from "@/lib/export-jobs";
import { formatDateHeure } from "@/lib/format";
import { entetesFichierPrive, entetesReponsePrivee } from "@/lib/http";
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
  const admin = await requireAdmin();
  const url = new URL(request.url);

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

  const roleAuteur =
    url.searchParams.get("roleAuteur") === "ADMIN"
      ? ("ADMIN" satisfies RoleUtilisateur)
      : undefined;
  const where = construireFiltreAudit({
    utilisateurId: url.searchParams.get("utilisateur") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    entite: url.searchParams.get("entite") ?? undefined,
    bornes,
    roleAuteur,
  });

  const prefixe = roleAuteur ? "historique_admins" : "audit";
  const filename = `${prefixe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const total = await prisma.auditLog.count({ where });

  if (total > 5000) {
    const job = await creerExportJob(
      filename,
      { utilisateurId: admin.id, access: "ADMIN" },
      async (filePath) => {
        const audits = await chargerAuditExport(where);
        const workbook = remplirWorkbook(audits);
        await workbook.xlsx.writeFile(filePath);
      },
    );

    return Response.json(
      {
        status: "pending",
        message: "Export audit volumineux lance en arriere-plan.",
        downloadUrl: job.url,
      },
      { status: 202, headers: entetesReponsePrivee },
    );
  }

  const audits = await chargerAuditExport(where);
  const workbook = remplirWorkbook(audits);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    headers: entetesFichierPrive(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `attachment; filename="${filename}"`,
    ),
  });
}
