import type { Prisma } from "@prisma/client";
import { remplirWorkbookCommandes } from "@/app/commandes/excel-commandes";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { creerExportJob } from "@/lib/export-jobs";
import { entetesFichierPrive, entetesReponsePrivee } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

type CommandeExport = Awaited<ReturnType<typeof chargerCommandesExport>>[number];

async function chargerCommandesExport(where: Prisma.CommandeWhereInput) {
  return prisma.commande.findMany({
    where,
    orderBy: { date_commande: "desc" },
    select: {
      numero_bl: true,
      type_commande: true,
      date_commande: true,
      client: { select: { nom: true } },
      client_externe: { select: { nom: true } },
      utilisateur: { select: { nom_complet: true } },
      lignes: { where: { deleted_at: null }, select: { prix_net: true } },
      paiements: { select: { montant: true } },
    },
  });
}

function remplirWorkbook(commandes: CommandeExport[], statut: "paye" | "en_attente" | undefined) {
  return remplirWorkbookCommandes({ commandes, statut, portee: "admin" });
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  const url = new URL(request.url);
  const recherche = (url.searchParams.get("q") ?? "").trim();
  const commercial = url.searchParams.get("commercial") || undefined;
  const typeParam = url.searchParams.get("type");
  const type = typeParam === "STANDARD" || typeParam === "EXTERNE" ? typeParam : undefined;
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
      return new Response(
        "Periode invalide : la date fin doit etre egale ou posterieure a la date debut.",
        { status: 400 },
      );
    }
  }

  const where: Prisma.CommandeWhereInput = {
    deleted_at: null,
    ...(commercial ? { utilisateur_id: commercial } : {}),
    ...(type ? { type_commande: type } : {}),
    ...(bornes ? { date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
    ...(recherche
      ? {
          OR: [
            { numero_bl: { contains: recherche } },
            { client: { nom: { contains: recherche } } },
            { client_externe: { nom: { contains: recherche } } },
            { utilisateur: { nom_complet: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const filename = `${
    type === "EXTERNE" ? "commandes_externes" : "commandes"
  }_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const totalBrut = await prisma.commande.count({ where });
  if (totalBrut > 5000) {
    const job = await creerExportJob(
      filename,
      { utilisateurId: admin.id, access: "ADMIN" },
      async (filePath) => {
        const commandes = await chargerCommandesExport(where);
        const workbook = remplirWorkbook(commandes, statut);
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

  const commandes = await chargerCommandesExport(where);
  const workbook = remplirWorkbook(commandes, statut);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as BodyInit, {
    headers: entetesFichierPrive(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `attachment; filename="${filename}"`,
    ),
  });
}
