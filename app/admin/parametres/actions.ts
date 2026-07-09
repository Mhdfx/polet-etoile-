"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { erreursParChamp, type ResultatAction } from "@/lib/validations/commun";
import { schemaParametresSysteme } from "@/lib/validations/parametres";

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Reessayez ou contactez l'administrateur.";

const clesParametres = {
  raisonSociale: "raison_sociale",
  ice: "ice",
  rc: "rc",
  identifiantFiscal: "identifiant_fiscal",
  patente: "patente",
  adresse: "adresse",
  telephone: "telephone",
  logoUrl: "logo_url",
  tauxTva: "taux_tva",
  prefixeBl: "prefixe_bl",
  fuseauHoraire: "fuseau_horaire",
} as const;

function erreurServeur(erreur: unknown): ResultatAction {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[parametres:modification] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

const typesLogoAutorises = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/svg+xml", "svg"],
]);

export async function televerserLogoSociete(formData: FormData): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const fichier = formData.get("logo");

  if (!(fichier instanceof File) || fichier.size === 0) {
    return { ok: false, erreurs: { logo: "Choisissez un fichier logo" } };
  }

  const extension = typesLogoAutorises.get(fichier.type);
  if (!extension) {
    return { ok: false, erreurs: { logo: "Logo PNG, JPG ou SVG uniquement" } };
  }

  if (fichier.size > 2 * 1024 * 1024) {
    return { ok: false, erreurs: { logo: "Le logo ne doit pas depasser 2 Mo" } };
  }

  try {
    const ip = await adresseIpRequete();
    const nomFichier = `logo-${randomUUID()}.${extension}`;
    const dossier = path.join(process.cwd(), "public", "uploads", "logos");
    const cheminDisque = path.join(dossier, nomFichier);
    const cheminPublic = `/uploads/logos/${nomFichier}`;

    await mkdir(dossier, { recursive: true });
    await writeFile(cheminDisque, Buffer.from(await fichier.arrayBuffer()));

    await prisma.$transaction(async (tx) => {
      const avant = await tx.parametreSysteme.findUnique({
        where: { cle: "logo_url" },
        select: { valeur: true },
      });

      await tx.parametreSysteme.upsert({
        where: { cle: "logo_url" },
        create: { cle: "logo_url", valeur: cheminPublic, updated_by: admin.id },
        update: { valeur: cheminPublic, updated_by: admin.id },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "parametres.logo_upload",
          entite: "parametres_systeme",
          entiteId: "logo_url",
          avant: { logo_url: avant?.valeur ?? null },
          apres: { logo_url: cheminPublic, type: fichier.type, taille: fichier.size },
        },
        ip,
      );
    });

    revalidatePath("/admin/parametres");
    return { ok: true };
  } catch (erreur) {
    return erreurServeur(erreur);
  }
}

export async function modifierParametresSysteme(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaParametresSysteme.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  try {
    const ip = await adresseIpRequete();
    const donnees = validation.data;

    await prisma.$transaction(async (tx) => {
      const existants = await tx.parametreSysteme.findMany({
        where: { cle: { in: Object.values(clesParametres) } },
        select: { cle: true, valeur: true },
      });
      const avant = Object.fromEntries(existants.map((item) => [item.cle, item.valeur]));

      for (const [champ, cle] of Object.entries(clesParametres)) {
        const valeur = donnees[champ as keyof typeof donnees];
        await tx.parametreSysteme.upsert({
          where: { cle },
          create: { cle, valeur, updated_by: admin.id },
          update: { valeur, updated_by: admin.id },
        });
      }

      const apres = Object.fromEntries(
        Object.entries(clesParametres).map(([champ, cle]) => [
          cle,
          donnees[champ as keyof typeof donnees],
        ]),
      );

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "parametres.modification",
          entite: "parametres_systeme",
          entiteId: "global",
          avant,
          apres,
        },
        ip,
      );
    });

    revalidatePath("/admin/parametres");
    revalidatePath("/admin/commandes");
    return { ok: true };
  } catch (erreur) {
    return erreurServeur(erreur);
  }
}
