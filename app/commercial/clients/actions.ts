"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireCommercial } from "@/lib/session";
import { erreursParChamp, type ResultatAction } from "@/lib/validations/commun";
import {
  schemaCreationClientCommercial,
  schemaModificationClientCommercial,
} from "@/lib/validations/client";

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Reessayez ou contactez l'administrateur.";

function erreurServeur(erreur: unknown, action: string): ResultatAction {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[clients-commercial:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

class AccesClientInterdit extends Error {}

export async function creerClientCommercial(
  entree: unknown,
): Promise<ResultatAction> {
  const commercial = await requireCommercial();
  const validation = schemaCreationClientCommercial.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { nom, regionVille, telephone } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const doublon = await tx.client.findFirst({
        where: { nom, commercial_id: commercial.id, deleted_at: null },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Vous avez deja un client actif avec ce nom" },
        };
      }

      const client = await tx.client.create({
        data: {
          nom,
          region_ville: regionVille,
          telephone,
          commercial_id: commercial.id,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: commercial.id,
          action: "client.creation",
          entite: "clients",
          entiteId: client.id,
          apres: { nom, region_ville: regionVille, telephone, commercial_id: commercial.id },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/commercial/clients");
      revalidatePath("/admin/clients");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation");
  }
}

export async function modifierClientCommercial(
  entree: unknown,
): Promise<ResultatAction> {
  const commercial = await requireCommercial();
  const validation = schemaModificationClientCommercial.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { id, nom, regionVille, telephone } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.client.findFirst({
        where: { id, deleted_at: null },
        select: {
          nom: true,
          region_ville: true,
          telephone: true,
          commercial_id: true,
          actif: true,
        },
      });

      if (!existant) {
        return { ok: false as const, message: "Client introuvable" };
      }

      if (existant.commercial_id !== commercial.id) {
        throw new AccesClientInterdit();
      }

      const doublon = await tx.client.findFirst({
        where: {
          id: { not: id },
          nom,
          commercial_id: commercial.id,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Vous avez deja un client actif avec ce nom" },
        };
      }

      await tx.client.update({
        where: { id },
        data: { nom, region_ville: regionVille, telephone },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: commercial.id,
          action: "client.modification",
          entite: "clients",
          entiteId: id,
          avant: existant,
          apres: { nom, region_ville: regionVille, telephone },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/commercial/clients");
      revalidatePath("/admin/clients");
    }

    return resultat;
  } catch (erreur) {
    if (erreur instanceof AccesClientInterdit) {
      redirect("/403");
    }

    return erreurServeur(erreur, "modification");
  }
}

export async function supprimerClientCommercial(id: string): Promise<ResultatAction> {
  const commercial = await requireCommercial();

  if (!id) {
    return { ok: false, message: "Client introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.client.findFirst({
        where: { id, deleted_at: null },
        select: { nom: true, region_ville: true, telephone: true, commercial_id: true },
      });

      if (!existant) {
        return { ok: false as const, message: "Client introuvable" };
      }

      if (existant.commercial_id !== commercial.id) {
        throw new AccesClientInterdit();
      }

      await tx.client.update({
        where: { id },
        data: { actif: false, deleted_at: new Date() },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: commercial.id,
          action: "client.suppression",
          entite: "clients",
          entiteId: id,
          avant: existant,
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/commercial/clients");
      revalidatePath("/admin/clients");
    }

    return resultat;
  } catch (erreur) {
    if (erreur instanceof AccesClientInterdit) {
      redirect("/403");
    }

    return erreurServeur(erreur, "suppression");
  }
}
