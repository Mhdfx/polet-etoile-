import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { AppShell } from "@/components/app-shell";
import { CommandeEditForm } from "@/app/commandes/commande-edit-form";
import { prisma } from "@/lib/db";
import { FUSEAU_APPLICATION } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function ModifierCommandeAdminPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [commande, produits, clients, clientsExternes, responsables] =
    await Promise.all([
      prisma.commande.findFirst({
        where: { id, deleted_at: null },
        select: {
          id: true,
          numero_bl: true,
          utilisateur_id: true,
          type_commande: true,
          client_id: true,
          client_externe_id: true,
          date_commande: true,
          lignes: {
            where: { deleted_at: null },
            orderBy: { created_at: "asc" },
            select: { produit_id: true, quantite: true },
          },
        },
      }),
      prisma.produit.findMany({
        where: { actif: true, deleted_at: null },
        orderBy: [{ ordre_affichage: "asc" }, { nom: "asc" }],
        select: { id: true, nom: true, prix_reference: true },
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
        where: {
          role: { in: ["ADMIN", "COMMERCIAL"] },
          actif: true,
          deleted_at: null,
        },
        orderBy: [{ role: "asc" }, { nom_complet: "asc" }],
        select: { id: true, nom_complet: true, nom_utilisateur: true, role: true },
      }),
    ]);

  if (!commande) {
    notFound();
  }

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/commandes"
      titre={`Modifier ${commande.numero_bl}`}
      description="Modification admin du BL. Le numero reste conserve et chaque changement est audite."
    >
      <CommandeEditForm
        commande={{
          id: commande.id,
          numeroBl: commande.numero_bl,
          commercialId: commande.utilisateur_id,
          typeClient: commande.type_commande === "EXTERNE" ? "EXTERNE" : "STANDARD",
          clientId: commande.client_id ?? undefined,
          clientExterneId: commande.client_externe_id ?? undefined,
          dateCommande: DateTime.fromJSDate(commande.date_commande)
            .setZone(FUSEAU_APPLICATION)
            .toFormat("yyyy-MM-dd"),
          lignes: commande.lignes.map((ligne) => ({
            produitId: ligne.produit_id,
            quantite: ligne.quantite.toFixed(3).replace(".", ","),
          })),
        }}
        produits={produits.map((produit) => ({
          id: produit.id,
          nom: produit.nom,
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
        responsables={responsables.map((responsable) => ({
          id: responsable.id,
          nom: `${responsable.nom_complet} (${responsable.nom_utilisateur}) - ${
            responsable.role === "ADMIN" ? "Admin" : "Commercial"
          }`,
        }))}
      />
    </AppShell>
  );
}
