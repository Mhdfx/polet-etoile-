import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { UtilisateursTable } from "./utilisateurs-table";

const TAILLE_PAGE = 10;

type ParametresRecherche = Promise<{ page?: string; q?: string }>;

export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const recherche = (params.q ?? "").trim();

  const where = {
    deleted_at: null,
    ...(recherche
      ? {
          OR: [
            { nom_complet: { contains: recherche } },
            { nom_utilisateur: { contains: recherche } },
          ],
        }
      : {}),
  };

  const [totalLignes, utilisateurs] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { nom_complet: "asc" }],
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
      select: {
        id: true,
        nom_utilisateur: true,
        nom_complet: true,
        role: true,
        actif: true,
        derniere_connexion_at: true,
      },
    }),
  ]);

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/utilisateurs"
      titre="Utilisateurs"
      description="Comptes admin et commerciaux : création, mot de passe, activation, suppression logique et objectifs mensuels."
    >
      <UtilisateursTable
        lignes={utilisateurs.map((utilisateur) => ({
          id: utilisateur.id,
          nomComplet: utilisateur.nom_complet,
          nomUtilisateur: utilisateur.nom_utilisateur,
          role: utilisateur.role,
          actif: utilisateur.actif,
          derniereConnexion: utilisateur.derniere_connexion_at
            ? formatDateHeure(utilisateur.derniere_connexion_at)
            : "—",
        }))}
        page={page}
        taillePage={TAILLE_PAGE}
        totalLignes={totalLignes}
        recherche={recherche}
        idAdminConnecte={admin.id}
      />
    </AppShell>
  );
}
