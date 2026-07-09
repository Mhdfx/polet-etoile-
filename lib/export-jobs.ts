import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

type ExportJob = {
  id: string;
  filename: string;
  filePath: string;
  status: "pending" | "done" | "error";
  error?: string;
  createdAt: Date;
  finishedAt?: Date;
};

const globalForExports = globalThis as typeof globalThis & {
  __pouletExportJobs?: Map<string, ExportJob>;
};

const jobs = globalForExports.__pouletExportJobs ?? new Map<string, ExportJob>();
globalForExports.__pouletExportJobs = jobs;

export async function creerExportJob(
  filename: string,
  generer: (filePath: string) => Promise<void>,
) {
  const id = randomUUID();
  const dossier = path.join(process.cwd(), "public", "exports");
  const filePath = path.join(dossier, `${id}-${filename}`);
  await mkdir(dossier, { recursive: true });

  const job: ExportJob = {
    id,
    filename,
    filePath,
    status: "pending",
    createdAt: new Date(),
  };
  jobs.set(id, job);

  void generer(filePath)
    .then(() => {
      job.status = "done";
      job.finishedAt = new Date();
    })
    .catch((error: unknown) => {
      job.status = "error";
      job.error = error instanceof Error ? error.message : "Erreur export inconnue";
      job.finishedAt = new Date();
    });

  return { id, url: `/exports/jobs/${id}` };
}

export function lireExportJob(id: string) {
  return jobs.get(id);
}
