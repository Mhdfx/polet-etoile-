"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { erreursParChamp, type ResultatAction } from "@/lib/validations/commun";
import {
  schemaCreationClientAdmin,
  schemaCreationClientExterne,
  schemaModificationClientAdmin,
  schemaModificationClientExterne,
} from "@/lib/validations/client";

const schemaFusionClients = z.object({
  sourceId: z.string().min(1, "Client doublon obligatoire"),
  cibleId: z.string().min(1, "Client conserve obligatoire"),
}).refine((valeur) => valeur.sourceId !== valeur.cibleId, {
  path: ["cibleId"],
  message: "Les deux clients doivent etre differents",
});

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Reessayez ou contactez l'administrateur.";

type ClientCreeAction = {
  client: {
    id: string;
    nom: string;
    ville: string;
    commercialId: string;
  };
};

type ResultatErreur = Extract<ResultatAction, { ok: false }>;

function erreurServeur<TSucces extends object = object>(
  erreur: unknown,
  action: string,
): ResultatAction<TSucces> {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[clients-admin:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (ref. ${idErreur})` };
}

async function verifierResponsableClientActif(
  tx: Prisma.TransactionClient,
  responsableId: string,
): Promise<ResultatErreur | null> {
  const responsable = await tx.user.findFirst({
    where: {
      id: responsableId,
      role: { in: ["ADMIN", "COMMERCIAL"] },
      actif: true,
      deleted_at: null,
    },
    select: { id: true },
  });

  return responsable
    ? null
    : { ok: false, erreurs: { commercialId: "Responsable introuvable" } };
}

export async function creerClientAdmin(
  entree: unknown,
): Promise<ResultatAction<ClientCreeAction>> {
  const admin = await requireAdmin();
  const validation = schemaCreationClientAdmin.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const {
    nom,
    regionVille,
    adresse,
    telephone,
    commercialId,
    selectionCommande,
  } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const erreurCommercial = await verifierResponsableClientActif(tx, commercialId);
      if (erreurCommercial) {
        return erreurCommercial;
      }

      const doublon = await tx.client.findFirst({
        where: { nom, commercial_id: commercialId, deleted_at: null },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Ce responsable a deja un client actif avec ce nom" },
        };
      }

      const client = await tx.client.create({
        data: {
          nom,
          region_ville: regionVille,
          adresse,
          telephone,
          commercial_id: commercialId,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "client.creation",
          entite: "clients",
          entiteId: client.id,
          apres: { nom, region_ville: regionVille, adresse, telephone, commercial_id: commercialId },
        },
        ip,
      );

      return {
        ok: true as const,
        client: {
          id: client.id,
          nom,
          ville: regionVille,
          commercialId,
        },
      };
    });

    if (resultat.ok) {
      revalidatePath("/admin/clients");
      if (selectionCommande) {
        const cookieStore = await cookies();
        cookieStore.set("commande_client_selection_admin", resultat.client.id, {
          path: "/admin/commandes/nouvelle",
          maxAge: 120,
          sameSite: "lax",
        });
      }
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation");
  }
}

export async function modifierClientAdmin(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaModificationClientAdmin.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { id, nom, regionVille, adresse, telephone, commercialId } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.client.findFirst({
        where: { id, deleted_at: null },
        select: {
          nom: true,
          region_ville: true,
          adresse: true,
          telephone: true,
          commercial_id: true,
          actif: true,
        },
      });

      if (!existant) {
        return { ok: false as const, message: "Client introuvable" };
      }

      const erreurCommercial = await verifierResponsableClientActif(tx, commercialId);
      if (erreurCommercial) {
        return erreurCommercial;
      }

      const doublon = await tx.client.findFirst({
        where: {
          id: { not: id },
          nom,
          commercial_id: commercialId,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Ce responsable a deja un client actif avec ce nom" },
        };
      }

      await tx.client.update({
        where: { id },
        data: {
          nom,
          region_ville: regionVille,
          adresse,
          telephone,
          commercial_id: commercialId,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "client.modification",
          entite: "clients",
          entiteId: id,
          avant: existant,
          apres: { nom, region_ville: regionVille, adresse, telephone, commercial_id: commercialId },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/clients");
      revalidatePath("/commercial/clients");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "modification");
  }
}

export async function supprimerClientAdmin(id: string): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!id) {
    return { ok: false, message: "Client introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.client.findFirst({
        where: { id, deleted_at: null },
        select: { nom: true, region_ville: true, adresse: true, telephone: true, commercial_id: true },
      });

      if (!existant) {
        return { ok: false as const, message: "Client introuvable" };
      }

      await tx.client.update({
        where: { id },
        data: { actif: false, deleted_at: new Date() },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
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
      revalidatePath("/admin/clients");
      revalidatePath("/commercial/clients");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "suppression");
  }
}

export async function creerClientExterne(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaCreationClientExterne.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { nom, regionVille, adresse, telephone } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const doublon = await tx.clientExterne.findFirst({
        where: { nom, deleted_at: null },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Un client externe actif porte deja ce nom" },
        };
      }

      const client = await tx.clientExterne.create({
        data: { nom, region_ville: regionVille, adresse, telephone },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "client_externe.creation",
          entite: "clients_externes",
          entiteId: client.id,
          apres: { nom, region_ville: regionVille, adresse, telephone },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/clients");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation_externe");
  }
}

export async function modifierClientExterne(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaModificationClientExterne.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { id, nom, regionVille, adresse, telephone } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.clientExterne.findFirst({
        where: { id, deleted_at: null },
        select: { nom: true, region_ville: true, adresse: true, telephone: true, actif: true },
      });

      if (!existant) {
        return { ok: false as const, message: "Client externe introuvable" };
      }

      const doublon = await tx.clientExterne.findFirst({
        where: { id: { not: id }, nom, deleted_at: null },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: { nom: "Un client externe actif porte deja ce nom" },
        };
      }

      await tx.clientExterne.update({
        where: { id },
        data: { nom, region_ville: regionVille, adresse, telephone },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "client_externe.modification",
          entite: "clients_externes",
          entiteId: id,
          avant: existant,
          apres: { nom, region_ville: regionVille, adresse, telephone },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/clients");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "modification_externe");
  }
}

export async function supprimerClientExterne(id: string): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!id) {
    return { ok: false, message: "Client externe introuvable" };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const existant = await tx.clientExterne.findFirst({
        where: { id, deleted_at: null },
        select: { nom: true, region_ville: true, adresse: true, telephone: true },
      });

      if (!existant) {
        return { ok: false as const, message: "Client externe introuvable" };
      }

      await tx.clientExterne.update({
        where: { id },
        data: { actif: false, deleted_at: new Date() },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "client_externe.suppression",
          entite: "clients_externes",
          entiteId: id,
          avant: existant,
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/clients");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "suppression_externe");
  }
}

export async function fusionnerClientsAdmin(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaFusionClients.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { sourceId, cibleId } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const [source, cible] = await Promise.all([
        tx.client.findFirst({
          where: { id: sourceId, deleted_at: null },
          select: { id: true, nom: true, commercial_id: true },
        }),
        tx.client.findFirst({
          where: { id: cibleId, deleted_at: null },
          select: { id: true, nom: true, commercial_id: true },
        }),
      ]);

      if (!source || !cible) {
        return { ok: false as const, message: "Client introuvable" };
      }

      const reassignees = await tx.commande.updateMany({
        where: { client_id: source.id, deleted_at: null },
        data: { client_id: cible.id },
      });

      await tx.client.update({
        where: { id: source.id },
        data: { actif: false, deleted_at: new Date() },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "client.fusion",
          entite: "clients",
          entiteId: cible.id,
          avant: {
            source,
            cible,
            commandes_source: reassignees.count,
          },
          apres: {
            client_conserve: cible.id,
            client_supprime: source.id,
          },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/clients");
      revalidatePath(`/admin/clients/${cibleId}`);
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "fusion");
  }
}
