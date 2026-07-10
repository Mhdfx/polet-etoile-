import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

type ExportJobStatus = "pending" | "done" | "error";
export type ExportJobAccess = "ADMIN" | "UTILISATEUR";

export type ExportJob = {
  id: string;
  filename: string;
  filePath: string;
  status: ExportJobStatus;
  access: ExportJobAccess;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  finishedAt?: string;
};

type CreateurExport = {
  utilisateurId: string;
  access: ExportJobAccess;
};

const DOSSIER_EXPORTS = path.join(process.cwd(), "exports-prive");
const DUREE_CONSERVATION_MS = 24 * 60 * 60 * 1000;
const FORMAT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const schemaMetaExport = z.object({
  id: z.string().regex(FORMAT_ID),
  filename: z.string().regex(/^[A-Za-z0-9._-]+\.xlsx$/),
  status: z.enum(["pending", "done", "error"]),
  access: z.enum(["ADMIN", "UTILISATEUR"]),
  createdBy: z.string().min(1).max(191),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().optional(),
});

function normaliserNomFichier(filename: string): string {
  const nom = path.basename(filename).replace(/[^A-Za-z0-9._-]/g, "_");
  return nom.toLowerCase().endsWith(".xlsx") ? nom : `${nom}.xlsx`;
}

function cheminMeta(id: string): string {
  return path.join(DOSSIER_EXPORTS, `${id}.json`);
}

function cheminFichier(id: string, filename: string): string {
  return path.join(DOSSIER_EXPORTS, `${id}-${filename}`);
}

async function ecrireMeta(job: Omit<ExportJob, "filePath">): Promise<void> {
  await writeFile(cheminMeta(job.id), JSON.stringify(job), "utf8");
}

async function supprimerJobExpire(id: string, filename: string): Promise<void> {
  await Promise.allSettled([
    rm(cheminMeta(id), { force: true }),
    rm(cheminFichier(id, filename), { force: true }),
  ]);
}

export function peutTelechargerExport(
  job: ExportJob,
  utilisateur: { id: string; role: "ADMIN" | "COMMERCIAL" },
): boolean {
  if (job.access === "ADMIN") {
    return utilisateur.role === "ADMIN";
  }

  return job.createdBy === utilisateur.id;
}

export async function creerExportJob(
  filename: string,
  createur: CreateurExport,
  generer: (filePath: string) => Promise<void>,
) {
  const id = randomUUID();
  const nomFichier = normaliserNomFichier(filename);
  await mkdir(DOSSIER_EXPORTS, { recursive: true });
  const filePath = cheminFichier(id, nomFichier);

  const job: Omit<ExportJob, "filePath"> = {
    id,
    filename: nomFichier,
    status: "pending",
    access: createur.access,
    createdBy: createur.utilisateurId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + DUREE_CONSERVATION_MS).toISOString(),
  };
  await ecrireMeta(job);

  void generer(filePath)
    .then(async () => {
      job.status = "done";
      job.finishedAt = new Date().toISOString();
      await ecrireMeta(job);
    })
    .catch(async (error: unknown) => {
      job.status = "error";
      job.finishedAt = new Date().toISOString();
      console.error(`[export:${id}] generation impossible`, error);
      await ecrireMeta(job);
    });

  const route = createur.access === "ADMIN" ? "/admin/exports/jobs" : "/exports/jobs";
  return { id, url: `${route}/${id}` };
}

export async function lireExportJob(id: string): Promise<ExportJob | undefined> {
  if (!FORMAT_ID.test(id)) {
    return undefined;
  }

  try {
    const contenu = await readFile(cheminMeta(id), "utf8");
    const validation = schemaMetaExport.safeParse(JSON.parse(contenu));
    if (!validation.success || validation.data.id !== id) {
      return undefined;
    }

    if (new Date(validation.data.expiresAt).getTime() <= Date.now()) {
      await supprimerJobExpire(id, validation.data.filename);
      return undefined;
    }

    return {
      ...validation.data,
      filePath: cheminFichier(id, validation.data.filename),
    };
  } catch {
    return undefined;
  }
}
