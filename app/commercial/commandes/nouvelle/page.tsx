import { AppShell } from "@/components/app-shell";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { formatMontant } from "@/lib/format";
import { requireCommercial } from "@/lib/session";
import { listerVillesMaroc } from "@/lib/villes";
import { CommandeForm } from "@/app/commandes/commande-form";

export default async function NouvelleCommandeCommercialPage() {
  const commercial = await requireCommercial();
  const cookieStore = await cookies();
  const clientSelectionInitiale =
    cookieStore.get("commande_client_selection_commercial")?.value ?? null;

  const [produits, clients, villes] = await Promise.all([
    prisma.produit.findMany({
      // suivi_stock : exclut les pseudo-produits (RELIQUAT PAYEMENT), reserves
      // a la saisie admin, du selecteur de commande commercial.
      where: { actif: true, deleted_at: null, suivi_stock: true },
      orderBy: [{ ordre_affichage: "asc" }, { nom: "asc" }],
      select: {
        id: true,
        nom: true,
        categorie: true,
        prix_reference: true,
      },
    }),
    prisma.client.findMany({
      where: {
        commercial_id: commercial.id,
        actif: true,
        deleted_at: null,
      },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, region_ville: true },
    }),
    listerVillesMaroc(),
  ]);

  return (
    <AppShell
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/commandes/nouvelle"
      titre="Nouvelle commande"
      description="Creation terrain avec prix catalogue figes, BL transactionnel et calcul serveur."
    >
      <CommandeForm
        mode="commercial"
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
        }))}
        villes={villes}
        clientSelectionInitiale={clientSelectionInitiale}
      />
    </AppShell>
  );
}
