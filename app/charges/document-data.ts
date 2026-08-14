import { notFound } from "next/navigation";
import Decimal from "decimal.js";
import { chargerLogoDataUri } from "@/app/commandes/document-data";
import { prisma } from "@/lib/db";
import { arrondirQuantite, sommerQuantites } from "@/lib/decimal";
import { formatDate, formatDateHeure, formatMontant } from "@/lib/format";
import { calculerMontantsBonCharge } from "./montants-bon-charge";
import { regrouperLignesBonCharge } from "./regrouper-lignes-bon-charge";

export type BonChargeDocumentData = {
  societe: {
    raisonSociale: string;
    ice?: string;
    rc?: string;
    identifiantFiscal?: string;
    patente?: string;
    adresse?: string;
    telephone?: string;
    logo?: string;
  };
  id: string;
  numeroBc: string;
  dateCharge: string;
  creeLe: string;
  commercial: string;
  createur: string;
  commande?: {
    id: string;
    numeroBl: string;
    client: string;
    ville: string;
    adresse: string;
  };
  commentaire?: string;
  totalKg: string;
  totalMontant?: string;
  lignes: Array<{
    produit: string;
    quantite: string;
    montant?: string;
  }>;
};

function formatQuantiteSansUnite(valeur: Decimal.Value): string {
  const [entier, decimales] = arrondirQuantite(valeur).toFixed(3).split(".");
  return `${entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimales}`;
}

export async function chargerBonChargeDocument(id: string): Promise<BonChargeDocumentData> {
  const bon = await prisma.bonCharge.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      numero_bc: true,
      date_charge: true,
      commentaire: true,
      created_at: true,
      commande: {
        select: {
          id: true,
          numero_bl: true,
          client: { select: { nom: true, region_ville: true, adresse: true } },
          client_externe: { select: { nom: true, region_ville: true, adresse: true } },
          lignes: {
            where: { deleted_at: null, produit: { suivi_stock: true } },
            orderBy: [{ created_at: "asc" }, { id: "asc" }],
            select: { produit_id: true, quantite: true, prix_net: true },
          },
        },
      },
      commercial: { select: { nom_complet: true } },
      createur: { select: { nom_complet: true } },
      lignes: {
        where: { deleted_at: null },
        orderBy: [
          { produit: { ordre_affichage: "asc" } },
          { created_at: "asc" },
          { id: "asc" },
        ],
        select: {
          quantite_kg: true,
          produit: { select: { id: true, nom: true } },
        },
      },
    },
  });

  if (!bon) {
    notFound();
  }

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
  const params = new Map(parametres.map((parametre) => [parametre.cle, parametre.valeur]));
  const totalKg = sommerQuantites(bon.lignes.map((ligne) => ligne.quantite_kg));
  const montants = calculerMontantsBonCharge(
    (bon.commande?.lignes ?? []).map((ligne) => ({
      produitId: ligne.produit_id,
      quantite: ligne.quantite,
      prixNet: ligne.prix_net,
    })),
    bon.lignes.map((ligne) => ({
      produitId: ligne.produit.id,
      quantite: ligne.quantite_kg,
    })),
  );

  const lignes = regrouperLignesBonCharge(
    bon.lignes.map((ligne, index) => ({
      produitId: ligne.produit.id,
      produit: ligne.produit.nom,
      quantite: ligne.quantite_kg,
      montant: montants[index],
    })),
  ).map((ligne) => ({
    produit: ligne.produit,
    quantite: formatQuantiteSansUnite(ligne.quantite),
    montant: ligne.montant
      ? formatMontant(ligne.montant).replace(/ DH$/, "")
      : undefined,
    montantDecimal: ligne.montant,
  }));
  const montantsComplets = lignes.every((ligne) => ligne.montantDecimal);
  const totalMontant = montantsComplets
    ? lignes.reduce(
        (total, ligne) => total.plus(ligne.montantDecimal ?? 0),
        new Decimal(0),
      )
    : undefined;

  return {
    societe: {
      raisonSociale: params.get("raison_sociale") || "COQ PLUS SARL",
      ice: params.get("ice"),
      rc: params.get("rc"),
      identifiantFiscal: params.get("identifiant_fiscal"),
      patente: params.get("patente"),
      adresse: params.get("adresse"),
      telephone: params.get("telephone"),
      logo: await chargerLogoDataUri(params.get("logo_url")),
    },
    id: bon.id,
    numeroBc: bon.numero_bc,
    dateCharge: formatDate(bon.date_charge),
    creeLe: formatDateHeure(bon.created_at),
    commercial: bon.commercial.nom_complet,
    createur: bon.createur.nom_complet,
    commande: bon.commande
      ? {
          id: bon.commande.id,
          numeroBl: bon.commande.numero_bl,
          client: (bon.commande.client ?? bon.commande.client_externe)?.nom ?? "-",
          ville:
            (bon.commande.client ?? bon.commande.client_externe)?.region_ville ?? "-",
          adresse: (bon.commande.client ?? bon.commande.client_externe)?.adresse ?? "-",
        }
      : undefined,
    commentaire: bon.commentaire ?? undefined,
    totalKg: formatQuantiteSansUnite(totalKg),
    totalMontant: totalMontant
      ? formatMontant(totalMontant).replace(/ DH$/, "")
      : undefined,
    lignes: lignes.map((ligne) => ({
      produit: ligne.produit,
      quantite: ligne.quantite,
      montant: ligne.montant,
    })),
  };
}
