import Decimal from "decimal.js";
import {
  chargerCachetDataUri,
  chargerLogoDataUri,
  chargerTamponAgrementDataUri,
} from "@/app/commandes/document-data";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { trierAlphabetiquement } from "@/lib/tri-alphabetique";
import type { TarifsDocumentData } from "./tarifs-pdf";

export async function chargerTarifsDocument(): Promise<TarifsDocumentData> {
  const [produits, parametres] = await Promise.all([
    prisma.produit.findMany({
      where: { actif: true, deleted_at: null, suivi_stock: true },
      orderBy: { nom: "asc" },
      select: { nom: true, prix_reference: true },
    }),
    prisma.parametreSysteme.findMany({
      where: {
        cle: {
          in: [
            "raison_sociale",
            "adresse",
            "telephone",
            "numero_agrement",
            "ice",
            "identifiant_fiscal",
            "logo_url",
          ],
        },
      },
      select: { cle: true, valeur: true },
    }),
  ]);
  const params = new Map(parametres.map((parametre) => [parametre.cle, parametre.valeur]));

  return {
    date: formatDate(new Date()),
    societe: {
      raisonSociale: params.get("raison_sociale") || "COQ PLUS SARL",
      adresse: params.get("adresse"),
      telephone: params.get("telephone"),
      numeroAgrement: params.get("numero_agrement"),
      ice: params.get("ice"),
      identifiantFiscal: params.get("identifiant_fiscal"),
      logo: await chargerLogoDataUri(params.get("logo_url")),
      cachet: await chargerCachetDataUri(),
      tamponAgrement: await chargerTamponAgrementDataUri(),
    },
    produits: trierAlphabetiquement(produits, (produit) => produit.nom).map((produit) => ({
      nom: produit.nom,
      prix: formatPrix(produit.prix_reference),
    })),
  };
}

function formatPrix(valeur: Decimal.Value): string {
  const decimal = new Decimal(valeur);
  return decimal.isInteger() ? decimal.toFixed(0) : decimal.toFixed(2).replace(".", ",");
}
