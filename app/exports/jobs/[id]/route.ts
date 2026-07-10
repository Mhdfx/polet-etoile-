import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { lireExportJob, peutTelechargerExport } from "@/lib/export-jobs";
import { entetesFichierPrive, entetesReponsePrivee } from "@/lib/http";
import { requireSession } from "@/lib/session";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const utilisateur = await requireSession();
  const { id } = await params;
  const job = await lireExportJob(id);

  if (!job || !peutTelechargerExport(job, utilisateur)) {
    return NextResponse.json(
      { message: "Export introuvable" },
      { status: 404, headers: entetesReponsePrivee },
    );
  }

  if (job.status === "pending") {
    return NextResponse.json(
      {
        status: "pending",
        message: "Export en cours de generation. Reessayez dans quelques secondes.",
      },
      { headers: entetesReponsePrivee },
    );
  }

  if (job.status === "error") {
    return NextResponse.json(
      { status: "error", message: "Generation export impossible" },
      { status: 500, headers: entetesReponsePrivee },
    );
  }

  const buffer = await readFile(job.filePath);
  return new Response(buffer as BodyInit, {
    headers: entetesFichierPrive(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `attachment; filename="${job.filename}"`,
    ),
  });
}
