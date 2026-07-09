import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { lireExportJob } from "@/lib/export-jobs";
import { requireAdmin } from "@/lib/session";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  await requireAdmin();
  const { id } = await params;
  const job = await lireExportJob(id);

  if (!job) {
    return NextResponse.json({ message: "Export introuvable" }, { status: 404 });
  }

  if (job.status === "pending") {
    return NextResponse.json({
      status: "pending",
      message: "Export en cours de generation. Reessayez dans quelques secondes.",
    });
  }

  if (job.status === "error") {
    return NextResponse.json(
      { status: "error", message: job.error ?? "Generation export impossible" },
      { status: 500 },
    );
  }

  const buffer = await readFile(job.filePath);
  return new Response(buffer as BodyInit, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${job.filename}"`,
    },
  });
}

