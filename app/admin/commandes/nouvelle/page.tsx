import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { CommandeForm } from "@/app/commandes/commande-form";

export default async function NouvelleCommandeAdminPage() {
  const admin = await requireAdmin();

  const [produits, clients, clientsExternes, commerciaux] = await Promise.all([
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
      where: { role: "COMMERCIAL", actif: true, deleted_at: null },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true, nom_utilisateur: true },
    }),
  ]);

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/commandes/nouvelle"
      titre="Nouvelle commande"
      description="Creation admin au nom d'un commercial, avec support client standard ou externe."
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
        commerciaux={commerciaux.map((commercial) => ({
          id: commercial.id,
          nom: `${commercial.nom_complet} (${commercial.nom_utilisateur})`,
        }))}
      />
    </AppShell>
  );
}
