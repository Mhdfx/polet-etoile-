import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { listerVillesMaroc } from "@/lib/villes";
import { AdminClientsTable } from "./clients-table";

const TAILLE_PAGE = 10;

type ParametresRecherche = Promise<{
  page?: string;
  q?: string;
  pageExternes?: string;
  qExternes?: string;
}>;

export default async function ClientsAdminPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageExternes = Math.max(
    1,
    Number.parseInt(params.pageExternes ?? "1", 10) || 1,
  );
  const recherche = (params.q ?? "").trim();
  const rechercheExternes = (params.qExternes ?? "").trim();

  const whereClients: Prisma.ClientWhereInput = {
    deleted_at: null,
    ...(recherche
      ? {
          OR: [
            { nom: { contains: recherche } },
            { region_ville: { contains: recherche } },
            { adresse: { contains: recherche } },
            { telephone: { contains: recherche } },
            { commercial: { nom_complet: { contains: recherche } } },
            { commercial: { nom_utilisateur: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const whereExternes: Prisma.ClientExterneWhereInput = {
    deleted_at: null,
    ...(rechercheExternes
      ? {
          OR: [
            { nom: { contains: rechercheExternes } },
            { region_ville: { contains: rechercheExternes } },
            { adresse: { contains: rechercheExternes } },
            { telephone: { contains: rechercheExternes } },
          ],
        }
      : {}),
  };

  const [
    totalClients,
    clients,
    totalExternes,
    clientsExternes,
    responsables,
    villes,
  ] = await Promise.all([
    prisma.client.count({ where: whereClients }),
    prisma.client.findMany({
      where: whereClients,
      orderBy: [{ nom: "asc" }],
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
      select: {
        id: true,
        nom: true,
        region_ville: true,
        adresse: true,
        telephone: true,
        actif: true,
        updated_at: true,
        commercial_id: true,
        commercial: {
          select: { nom_complet: true, nom_utilisateur: true },
        },
      },
    }),
    prisma.clientExterne.count({ where: whereExternes }),
    prisma.clientExterne.findMany({
      where: whereExternes,
      orderBy: [{ nom: "asc" }],
      skip: (pageExternes - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
      select: {
        id: true,
        nom: true,
        region_ville: true,
        adresse: true,
        telephone: true,
        actif: true,
        updated_at: true,
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "COMMERCIAL"] }, actif: true, deleted_at: null },
      orderBy: [{ role: "asc" }, { nom_complet: "asc" }],
      select: { id: true, nom_complet: true, nom_utilisateur: true, role: true },
    }),
    listerVillesMaroc(),
  ]);

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/clients"
      titre="Clients"
      description="Clients commerciaux et clients externes : affectation, ville, telephone, suppression logique et audit."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/admin/clients/fusion">Fusion clients</Link>
        </Button>
      </div>
      <AdminClientsTable
        lignes={clients.map((client) => ({
          id: client.id,
          nom: client.nom,
          regionVille: client.region_ville,
          adresse: client.adresse ?? "-",
          adresseBrute: client.adresse ?? "",
          telephone: client.telephone ?? "-",
          telephoneBrut: client.telephone ?? "",
          commercialId: client.commercial_id,
          commercial: client.commercial.nom_complet,
          commercialIdentifiant: client.commercial.nom_utilisateur,
          actif: client.actif,
          modifieLe: formatDate(client.updated_at),
        }))}
        lignesExternes={clientsExternes.map((client) => ({
          id: client.id,
          nom: client.nom,
          regionVille: client.region_ville,
          adresse: client.adresse ?? "-",
          adresseBrute: client.adresse ?? "",
          telephone: client.telephone ?? "-",
          telephoneBrut: client.telephone ?? "",
          actif: client.actif,
          modifieLe: formatDate(client.updated_at),
        }))}
        commerciaux={responsables.map((responsable) => ({
          id: responsable.id,
          nomComplet: responsable.nom_complet,
          nomUtilisateur: `${responsable.nom_utilisateur} - ${
            responsable.role === "ADMIN" ? "Admin" : "Commercial"
          }`,
        }))}
        villes={villes}
        page={page}
        pageExternes={pageExternes}
        taillePage={TAILLE_PAGE}
        totalLignes={totalClients}
        totalLignesExternes={totalExternes}
        recherche={recherche}
        rechercheExternes={rechercheExternes}
      />
    </AppShell>
  );
}
