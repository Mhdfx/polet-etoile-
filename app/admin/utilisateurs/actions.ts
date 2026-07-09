"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { adresseIpRequete, ecrireAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { erreursParChamp, type ResultatAction } from "@/lib/validations/commun";
import {
  schemaCreationUtilisateur,
  schemaObjectif,
  schemaReinitialisationMotDePasse,
} from "@/lib/validations/utilisateur";

const MESSAGE_ERREUR_SERVEUR =
  "Une erreur est survenue. Réessayez ou contactez l'administrateur.";

function erreurServeur(erreur: unknown, action: string): ResultatAction {
  const idErreur = randomUUID().slice(0, 8);
  console.error(`[utilisateurs:${action}] erreur ${idErreur}`, erreur);

  return { ok: false, message: `${MESSAGE_ERREUR_SERVEUR} (réf. ${idErreur})` };
}

function emailTechnique(nomUtilisateur: string): string {
  return `${nomUtilisateur}@poulet-etoile.local`;
}

export async function creerUtilisateur(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaCreationUtilisateur.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { nomComplet, nomUtilisateur, role, motDePasse } = validation.data;

  try {
    const ip = await adresseIpRequete();
    const motDePasseHache = await hashPassword(motDePasse);

    const resultat = await prisma.$transaction(async (tx) => {
      // Contrainte DB unique sur nom_utilisateur/email : couvre aussi les
      // comptes soft-delete (le nom reste reserve pour l'historique).
      const doublon = await tx.user.findFirst({
        where: {
          OR: [
            { nom_utilisateur: nomUtilisateur },
            { email: emailTechnique(nomUtilisateur) },
          ],
        },
        select: { id: true },
      });

      if (doublon) {
        return {
          ok: false as const,
          erreurs: {
            nomUtilisateur:
              "Ce nom d'utilisateur est déjà pris (y compris par un compte supprimé)",
          },
        };
      }

      const utilisateur = await tx.user.create({
        data: {
          nom_utilisateur: nomUtilisateur,
          nom_complet: nomComplet,
          email: emailTechnique(nomUtilisateur),
          email_verifie: true,
          role,
        },
      });

      await tx.account.create({
        data: {
          providerId: "credential",
          accountId: utilisateur.id,
          userId: utilisateur.id,
          password: motDePasseHache,
        },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "utilisateur.creation",
          entite: "users",
          entiteId: utilisateur.id,
          apres: { nom_utilisateur: nomUtilisateur, nom_complet: nomComplet, role },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/utilisateurs");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "creation");
  }
}

export async function reinitialiserMotDePasse(
  entree: unknown,
): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaReinitialisationMotDePasse.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { id, motDePasse } = validation.data;

  try {
    const ip = await adresseIpRequete();
    const motDePasseHache = await hashPassword(motDePasse);

    const resultat = await prisma.$transaction(async (tx) => {
      const utilisateur = await tx.user.findFirst({
        where: { id, deleted_at: null },
        select: { id: true },
      });

      if (!utilisateur) {
        return { ok: false as const, message: "Utilisateur introuvable" };
      }

      await tx.account.upsert({
        where: {
          providerId_accountId: { providerId: "credential", accountId: id },
        },
        create: {
          providerId: "credential",
          accountId: id,
          userId: id,
          password: motDePasseHache,
        },
        update: { password: motDePasseHache },
      });

      // Deconnexion forcee : les sessions existantes deviennent invalides.
      await tx.session.deleteMany({ where: { userId: id } });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "utilisateur.reinitialisation_mdp",
          entite: "users",
          entiteId: id,
        },
        ip,
      );

      return { ok: true as const };
    });

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "reinitialisation_mdp");
  }
}

async function dernierAdminActif(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  idCible: string,
): Promise<boolean> {
  const autresAdmins = await tx.user.count({
    where: {
      role: "ADMIN",
      actif: true,
      deleted_at: null,
      id: { not: idCible },
    },
  });

  return autresAdmins === 0;
}

export async function definirActivationUtilisateur(
  id: string,
  actif: boolean,
): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!id) {
    return { ok: false, message: "Utilisateur introuvable" };
  }

  if (id === admin.id && !actif) {
    return {
      ok: false,
      message: "Vous ne pouvez pas désactiver votre propre compte",
    };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const utilisateur = await tx.user.findFirst({
        where: { id, deleted_at: null },
        select: { actif: true, role: true },
      });

      if (!utilisateur) {
        return { ok: false as const, message: "Utilisateur introuvable" };
      }

      if (!actif && utilisateur.role === "ADMIN" && (await dernierAdminActif(tx, id))) {
        return {
          ok: false as const,
          message: "Impossible de désactiver le dernier administrateur actif",
        };
      }

      await tx.user.update({ where: { id }, data: { actif } });

      if (!actif) {
        await tx.session.deleteMany({ where: { userId: id } });
      }

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: actif ? "utilisateur.activation" : "utilisateur.desactivation",
          entite: "users",
          entiteId: id,
          avant: { actif: utilisateur.actif },
          apres: { actif },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/utilisateurs");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "activation");
  }
}

export async function supprimerUtilisateur(id: string): Promise<ResultatAction> {
  const admin = await requireAdmin();

  if (!id) {
    return { ok: false, message: "Utilisateur introuvable" };
  }

  if (id === admin.id) {
    return {
      ok: false,
      message: "Vous ne pouvez pas supprimer votre propre compte",
    };
  }

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const utilisateur = await tx.user.findFirst({
        where: { id, deleted_at: null },
        select: { nom_utilisateur: true, nom_complet: true, role: true, actif: true },
      });

      if (!utilisateur) {
        return { ok: false as const, message: "Utilisateur introuvable" };
      }

      if (utilisateur.role === "ADMIN" && (await dernierAdminActif(tx, id))) {
        return {
          ok: false as const,
          message: "Impossible de supprimer le dernier administrateur actif",
        };
      }

      await tx.user.update({
        where: { id },
        data: { deleted_at: new Date(), actif: false },
      });

      await tx.session.deleteMany({ where: { userId: id } });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: "utilisateur.suppression",
          entite: "users",
          entiteId: id,
          avant: utilisateur,
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath("/admin/utilisateurs");
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "suppression");
  }
}

export async function definirObjectif(entree: unknown): Promise<ResultatAction> {
  const admin = await requireAdmin();
  const validation = schemaObjectif.safeParse(entree);

  if (!validation.success) {
    return { ok: false, erreurs: erreursParChamp(validation.error) };
  }

  const { utilisateurId, mois, montant } = validation.data;

  try {
    const ip = await adresseIpRequete();

    const resultat = await prisma.$transaction(async (tx) => {
      const commercial = await tx.user.findFirst({
        where: { id: utilisateurId, role: "COMMERCIAL", deleted_at: null },
        select: { id: true },
      });

      if (!commercial) {
        return { ok: false as const, message: "Commercial introuvable" };
      }

      const existant = await tx.objectif.findUnique({
        where: {
          utilisateur_id_mois: { utilisateur_id: utilisateurId, mois },
        },
        select: { montant_objectif: true },
      });

      await tx.objectif.upsert({
        where: {
          utilisateur_id_mois: { utilisateur_id: utilisateurId, mois },
        },
        create: {
          utilisateur_id: utilisateurId,
          mois,
          montant_objectif: montant,
          created_by: admin.id,
        },
        update: { montant_objectif: montant, created_by: admin.id },
      });

      await ecrireAudit(
        tx,
        {
          utilisateurId: admin.id,
          action: existant ? "objectif.modification" : "objectif.creation",
          entite: "objectifs",
          entiteId: `${utilisateurId}:${mois}`,
          avant: existant
            ? { montant_objectif: String(existant.montant_objectif) }
            : undefined,
          apres: { mois, montant_objectif: montant },
        },
        ip,
      );

      return { ok: true as const };
    });

    if (resultat.ok) {
      revalidatePath(`/admin/utilisateurs/${utilisateurId}/objectifs`);
    }

    return resultat;
  } catch (erreur) {
    return erreurServeur(erreur, "objectif");
  }
}
