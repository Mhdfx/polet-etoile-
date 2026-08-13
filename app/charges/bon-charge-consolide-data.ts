import Decimal from "decimal.js";
import {
  chargerCachetDataUri,
  chargerLogoDataUri,
} from "@/app/commandes/document-data";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { construireLignesBonChargeConsolide } from "./lignes-bon-charge-consolide";

/** Nombre style FR (virgule decimale, espace milliers) SANS unite. */
function formatNombre(valeur: Decimal, decimales: number): string {
  const [entier, dec] = valeur.toFixed(decimales).split(".");
  const entierFormate = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec ? `${entierFormate},${dec}` : entierFormate;
}

export type BonChargeConsolideData = {
  societe: {
    raisonSociale: string;
    ice?: string;
    rc?: string;
    identifiantFiscal?: string;
    patente?: string;
    adresse?: string;
    telephone?: string;
    logo?: string;
    cachet?: string;
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
 * Bon de charge consolide : conserve chaque ligne de chaque commande
 * selectionnee (quantite + montant base sur le prix fige `prix_net`). Deux
 * occurrences du meme produit restent donc deux lignes distinctes. Les
 * produits hors stock (`suivi_stock = false`, ex. RELIQUAT PAYEMENT) sont
 * exclus, comme sur le bon de charge par commande.
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
      id: true,
      numero_bl: true,
      utilisateur: { select: { nom_complet: true } },
      lignes: {
        where: { deleted_at: null, produit: { suivi_stock: true } },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          quantite: true,
          prix_net: true,
          produit: { select: { nom: true } },
        },
      },
    },
  });

  const positionCommande = new Map(commandeIds.map((id, index) => [id, index]));
  commandes.sort(
    (a, b) =>
      (positionCommande.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (positionCommande.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
  const lignes = construireLignesBonChargeConsolide(
    commandes.map((commande) => ({
      lignes: commande.lignes.map((ligne) => ({
        produit: { nom: ligne.produit.nom },
        quantite: ligne.quantite,
        prixNet: ligne.prix_net,
      })),
    })),
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
    where: {
      cle: {
        in: [
          "raison_sociale",
          "ice",
          "rc",
          "identifiant_fiscal",
          "patente",
          "adresse",
          "telephone",
          "logo_url",
        ],
      },
    },
    select: { cle: true, valeur: true },
  });
  const parametresMap = new Map(parametres.map((p) => [p.cle, p.valeur]));

  return {
    societe: {
      raisonSociale: parametresMap.get("raison_sociale") || "COQ PLUS SARL",
      ice: parametresMap.get("ice"),
      rc: parametresMap.get("rc"),
      identifiantFiscal: parametresMap.get("identifiant_fiscal"),
      patente: parametresMap.get("patente"),
      adresse: parametresMap.get("adresse"),
      telephone: parametresMap.get("telephone"),
      logo: await chargerLogoDataUri(parametresMap.get("logo_url")),
      cachet: await chargerCachetDataUri(),
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
