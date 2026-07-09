import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireCommercial } from "@/lib/session";
import { listerVillesMaroc } from "@/lib/villes";
import { ClientsCommercialTable } from "./clients-table";

const TAILLE_PAGE = 10;

type ParametresRecherche = Promise<{ page?: string; q?: string }>;

export default async function ClientsCommercialPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const commercial = await requireCommercial();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const recherche = (params.q ?? "").trim();

  const where: Prisma.ClientWhereInput = {
    commercial_id: commercial.id,
    deleted_at: null,
    ...(recherche
      ? {
          OR: [
            { nom: { contains: recherche } },
            { region_ville: { contains: recherche } },
            { telephone: { contains: recherche } },
          ],
        }
      : {}),
  };

  const [totalLignes, clients, villes] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
      select: {
        id: true,
        nom: true,
        region_ville: true,
        telephone: true,
        actif: true,
        updated_at: true,
      },
    }),
    listerVillesMaroc(),
  ]);

  return (
    <AppShell
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/clients"
      titre="Mes clients"
      description="Portefeuille terrain : creation, mise a jour, ville, telephone et suppression logique."
    >
      <ClientsCommercialTable
        lignes={clients.map((client) => ({
          id: client.id,
          nom: client.nom,
          regionVille: client.region_ville,
          telephone: client.telephone ?? "-",
          telephoneBrut: client.telephone ?? "",
          actif: client.actif,
          modifieLe: formatDate(client.updated_at),
        }))}
        villes={villes}
        page={page}
        taillePage={TAILLE_PAGE}
        totalLignes={totalLignes}
        recherche={recherche}
      />
    </AppShell>
  );
}
