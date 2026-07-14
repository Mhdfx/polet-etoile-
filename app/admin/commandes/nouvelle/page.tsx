import { AppShell } from "@/components/app-shell";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { listerVillesMaroc } from "@/lib/villes";
import { CommandeForm } from "@/app/commandes/commande-form";

export default async function NouvelleCommandeAdminPage() {
  const admin = await requireAdmin();
  const cookieStore = await cookies();
  const clientSelectionInitiale =
    cookieStore.get("commande_client_selection_admin")?.value ?? null;

  const [produits, clients, clientsExternes, responsables, villes] = await Promise.all([
    prisma.produit.findMany({
      where: { actif: true, deleted_at: null },
      orderBy: [{ ordre_affichage: "asc" }, { nom: "asc" }],
      select: {
        id: true,
        nom: true,
        categorie: true,
        prix_reference: true,
      },
    }),
    prisma.client.findMany({
      where: { actif: true, deleted_at: null },
      orderBy: { nom: "asc" },
      select: {
        id: true,
        nom: true,
        region_ville: true,
        commercial_id: true,
      },
    }),
    prisma.clientExterne.findMany({
      where: { actif: true, deleted_at: null },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, region_ville: true },
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
      cheminActif="/admin/commandes/nouvelle"
      titre="Nouvelle commande"
      description="Creation admin au nom d'un commercial ou d'un administrateur, avec support client standard ou externe."
    >
      <CommandeForm
        mode="admin"
        produits={produits.map((produit) => ({
          id: produit.id,
          nom: produit.nom,
          categorie: produit.categorie,
          prixReference: produit.prix_reference.toFixed(2),
          prixReferenceLabel: formatMontant(produit.prix_reference),
        }))}
        clients={clients.map((client) => ({
          id: client.id,
          nom: client.nom,
          ville: client.region_ville,
          commercialId: client.commercial_id,
        }))}
        clientsExternes={clientsExternes.map((client) => ({
          id: client.id,
          nom: client.nom,
          ville: client.region_ville,
        }))}
        commerciaux={responsables.map((responsable) => ({
          id: responsable.id,
          nom: `${responsable.nom_complet} (${responsable.nom_utilisateur}) - ${
            responsable.role === "ADMIN" ? "Admin" : "Commercial"
          }`,
        }))}
        responsableInitialId={admin.id}
        villes={villes}
        clientSelectionInitiale={clientSelectionInitiale}
      />
    </AppShell>
  );
}
