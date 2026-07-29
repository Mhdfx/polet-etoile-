import Decimal from "decimal.js";
import { chargerLogoDataUri } from "@/app/commandes/document-data";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";

/** Nombre style FR (virgule decimale, espace milliers) SANS unite. */
function formatNombre(valeur: Decimal, decimales: number): string {
  const [entier, dec] = valeur.toFixed(decimales).split(".");
  const entierFormate = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec ? `${entierFormate},${dec}` : entierFormate;
}

export type BonChargeConsolideData = {
  societe: {
    raisonSociale: string;
    logo?: string;
  };
  genereLe: string;
  commercial: string;
  nombreCommandes: number;
  commandes: string[];
  lignes: Array<{
    produit: string;
    quantite: string;
    montant: string;
  }>;
  totalMontant: string;
  note?: string;
};

/**
 * Bon de charge consolide : agrege par produit les lignes des commandes
 * selectionnees (quantite totale + montant total base sur les prix figes
 * `prix_net`). Les produits hors stock (`suivi_stock = false`, ex. RELIQUAT
 * PAYEMENT) sont exclus, comme sur le bon de charge par commande.
 */
export async function chargerBonChargeConsolide(params: {
  commandeIds: string[];
  note?: string;
}): Promise<BonChargeConsolideData | null> {
  const { commandeIds, note } = params;

  if (commandeIds.length === 0) {
    return null;
  }

  const commandes = await prisma.commande.findMany({
    where: { id: { in: commandeIds }, deleted_at: null },
    select: {
      numero_bl: true,
      utilisateur: { select: { nom_complet: true } },
      lignes: {
        where: { deleted_at: null, produit: { suivi_stock: true } },
        select: {
          quantite: true,
          prix_net: true,
          produit: { select: { id: true, nom: true, ordre_affichage: true } },
        },
      },
    },
  });

  // Agregation par produit.
  const parProduit = new Map<
    string,
    { produit: string; ordre: number; quantite: Decimal; montant: Decimal }
  >();

  for (const commande of commandes) {
    for (const ligne of commande.lignes) {
      const cle = ligne.produit.id;
      const entree =
        parProduit.get(cle) ?? {
          produit: ligne.produit.nom,
          ordre: ligne.produit.ordre_affichage,
          quantite: new Decimal(0),
          montant: new Decimal(0),
        };
      entree.quantite = entree.quantite.plus(ligne.quantite);
      entree.montant = entree.montant.plus(ligne.prix_net);
      parProduit.set(cle, entree);
    }
  }

  const lignes = [...parProduit.values()].sort(
    (a, b) => a.ordre - b.ordre || a.produit.localeCompare(b.produit),
  );

  if (lignes.length === 0) {
    return null;
  }

  const totalMontant = lignes.reduce(
    (somme, ligne) => somme.plus(ligne.montant),
    new Decimal(0),
  );

  // Un seul commercial => son nom ; plusieurs => libelle explicite.
  const commerciaux = [
    ...new Set(commandes.map((commande) => commande.utilisateur.nom_complet)),
  ];
  const commercial =
    commerciaux.length === 1 ? commerciaux[0] : "Plusieurs commerciaux";

  const parametres = await prisma.parametreSysteme.findMany({
    where: { cle: { in: ["raison_sociale", "logo_url"] } },
    select: { cle: true, valeur: true },
  });
  const parametresMap = new Map(parametres.map((p) => [p.cle, p.valeur]));

  return {
    societe: {
      raisonSociale: parametresMap.get("raison_sociale") || "COQ PLUS SARL",
      logo: await chargerLogoDataUri(parametresMap.get("logo_url")),
    },
    genereLe: formatDateHeure(new Date()),
    commercial,
    nombreCommandes: commandes.length,
    commandes: commandes.map((commande) => commande.numero_bl),
    lignes: lignes.map((ligne) => ({
      produit: ligne.produit,
      quantite: formatNombre(ligne.quantite, 3),
      montant: formatNombre(ligne.montant, 2),
    })),
    totalMontant: formatNombre(totalMontant, 2),
    note,
  };
}
