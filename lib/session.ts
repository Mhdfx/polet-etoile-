import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RoleUtilisateur } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type UtilisateurSession = {
  id: string;
  nom_utilisateur: string;
  nom_complet: string;
  email: string;
  role: RoleUtilisateur;
};

export async function getUtilisateurSession(): Promise<UtilisateurSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  if (!session) {
    return null;
  }

  const utilisateur = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nom_utilisateur: true,
      nom_complet: true,
      email: true,
      role: true,
      actif: true,
      deleted_at: true,
    },
  });

  if (!utilisateur || !utilisateur.actif || utilisateur.deleted_at) {
    return null;
  }

  return {
    id: utilisateur.id,
    nom_utilisateur: utilisateur.nom_utilisateur,
    nom_complet: utilisateur.nom_complet,
    email: utilisateur.email,
    role: utilisateur.role,
  };
}

export async function requireSession(): Promise<UtilisateurSession> {
  const utilisateur = await getUtilisateurSession();

  if (!utilisateur) {
    redirect("/connexion");
  }

  return utilisateur;
}

export async function requireAdmin(): Promise<UtilisateurSession> {
  const utilisateur = await requireSession();

  if (utilisateur.role !== RoleUtilisateur.ADMIN) {
    redirect("/403");
  }

  return utilisateur;
}

export async function requireCommercial(): Promise<UtilisateurSession> {
  const utilisateur = await requireSession();

  if (utilisateur.role !== RoleUtilisateur.COMMERCIAL) {
    redirect("/403");
  }

  return utilisateur;
}

export async function requireOwnerOrAdmin(
  proprietaireId: string,
): Promise<UtilisateurSession> {
  const utilisateur = await requireSession();

  if (utilisateur.role === RoleUtilisateur.ADMIN || utilisateur.id === proprietaireId) {
    return utilisateur;
  }

  redirect("/403");
}

export function cheminAccueilPourRole(role: RoleUtilisateur): "/admin" | "/commercial" {
  return role === RoleUtilisateur.ADMIN ? "/admin" : "/commercial";
}
