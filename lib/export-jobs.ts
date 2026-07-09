import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

type ExportJobStatus = "pending" | "done" | "error";

type ExportJob = {
  id: string;
  filename: string;
  filePath: string;
  status: ExportJobStatus;
  error?: string;
  createdAt: string;
  finishedAt?: string;
};

// Dossier PRIVE (hors public/) : les exports contiennent des donnees metier et ne
// doivent etre servis que par les routes authentifiees /exports/jobs/[id] et
// /admin/exports/jobs/[id], jamais par le serveur statique Next.
// Les metadonnees de job sont persistees en JSON a cote du fichier : un job
// survit donc au redemarrage du serveur (mono-instance). Pour un deploiement
// multi-instances, prevoir un stockage partage (volume commun ou S3/Redis).
const DOSSIER_EXPORTS = path.join(process.cwd(), "exports-prive");

const FORMAT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cheminMeta(id: string): string {
  return path.join(DOSSIER_EXPORTS, `${id}.json`);
}

async function ecrireMeta(job: ExportJob): Promise<void> {
  await writeFile(cheminMeta(job.id), JSON.stringify(job), "utf8");
}

export async function creerExportJob(
  filename: string,
  generer: (filePath: string) => Promise<void>,
) {
  const id = randomUUID();
  await mkdir(DOSSIER_EXPORTS, { recursive: true });
  const filePath = path.join(DOSSIER_EXPORTS, `${id}-${filename}`);

  const job: ExportJob = {
    id,
    filename,
    filePath,
    status: "pending",
    createdAt: new Date().toISOString(),
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
      job.error = error instanceof Error ? error.message : "Erreur export inconnue";
      job.finishedAt = new Date().toISOString();
      await ecrireMeta(job);
    });

  return { id, url: `/exports/jobs/${id}` };
}

export async function lireExportJob(id: string): Promise<ExportJob | undefined> {
  // L'id vient de l'URL : format UUID strict pour interdire toute traversee de chemin.
  if (!FORMAT_ID.test(id)) {
    return undefined;
  }

  try {
    const contenu = await readFile(cheminMeta(id), "utf8");
    return JSON.parse(contenu) as ExportJob;
  } catch {
    return undefined;
  }
}
