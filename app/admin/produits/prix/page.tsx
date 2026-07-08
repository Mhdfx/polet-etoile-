import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatMontant } from "@/lib/format";
import { PrixMasseForm } from "./prix-masse-form";

export default async function PrixEnMassePage() {
  const utilisateur = await requireAdmin();

  const produits = await prisma.produit.findMany({
    where: { deleted_at: null, actif: true },
    orderBy: [{ ordre_affichage: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, categorie: true, prix_reference: true },
  });

  return (
    <AppShell
      utilisateur={utilisateur}
      espace="admin"
      cheminActif="/admin/produits"
      titre="Mise à jour des prix en masse"
      description="Saisir uniquement les prix à changer. L'application se fait en une seule transaction : tout passe ou rien ne passe, chaque changement est historisé."
    >
      <PrixMasseForm
        produits={produits.map((produit) => ({
          id: produit.id,
          nom: produit.nom,
          categorie: produit.categorie,
          prixActuel: formatMontant(produit.prix_reference),
        }))}
      />
    </AppShell>
  );
}
