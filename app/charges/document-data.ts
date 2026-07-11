import { notFound } from "next/navigation";
import { chargerLogoDataUri } from "@/app/commandes/document-data";
import { prisma } from "@/lib/db";
import { sommerQuantites } from "@/lib/decimal";
import { formatDate, formatDateHeure, formatQuantite } from "@/lib/format";

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
  };
  commentaire?: string;
  totalKg: string;
  lignes: Array<{
    produit: string;
    quantite: string;
  }>;
};

export async function chargerBonChargeDocument(id: string): Promise<BonChargeDocumentData> {
  const bon = await prisma.bonCharge.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      numero_bc: true,
      date_charge: true,
      commentaire: true,
      created_at: true,
      commande: { select: { id: true, numero_bl: true } },
      commercial: { select: { nom_complet: true } },
      createur: { select: { nom_complet: true } },
      lignes: {
        where: { deleted_at: null },
        orderBy: { produit: { ordre_affichage: "asc" } },
        select: {
          quantite_kg: true,
          produit: { select: { nom: true } },
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
        }
      : undefined,
    commentaire: bon.commentaire ?? undefined,
    totalKg: formatQuantite(totalKg),
    lignes: bon.lignes.map((ligne) => ({
      produit: ligne.produit.nom,
      quantite: formatQuantite(ligne.quantite_kg),
    })),
  };
}
