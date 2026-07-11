import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound, redirect } from "next/navigation";
import { calculerTotauxCommande, libelleStatutPaiement } from "@/lib/commandes-vue";
import { prisma } from "@/lib/db";
import { formatDateHeure, formatMontant } from "@/lib/format";
import { estCheminLogoPublic } from "@/lib/logo-upload";

export type CommandeDocumentData = {
  societe: {
    raisonSociale: string;
    ice?: string;
    rc?: string;
    logo?: string;
  };
  id: string;
  numeroBl: string;
  date: string;
  client: string;
  ville: string;
  commercial: string;
  total: string;
  totalPaye: string;
  resteDu: string;
  statut: string;
  lignes: Array<{
    produit: string;
    quantite: string;
    prixUnitaire: string;
    prixNet: string;
  }>;
};

export async function chargerCommandeDocument(
  id: string,
  commercialId?: string,
): Promise<CommandeDocumentData> {
  const commande = await prisma.commande.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      numero_bl: true,
      utilisateur_id: true,
      date_commande: true,
      client: { select: { nom: true, region_ville: true } },
      client_externe: { select: { nom: true, region_ville: true } },
      utilisateur: { select: { nom_complet: true } },
      lignes: {
        where: { deleted_at: null },
        select: {
          produit: { select: { nom: true } },
          quantite: true,
          prix_unitaire: true,
          prix_net: true,
        },
      },
      paiements: { select: { montant: true } },
    },
  });

  if (!commande) {
    notFound();
  }

  if (commercialId && commande.utilisateur_id !== commercialId) {
    redirect("/403");
  }

  const parametres = await prisma.parametreSysteme.findMany({
    where: { cle: { in: ["raison_sociale", "ice", "rc", "logo_url"] } },
    select: { cle: true, valeur: true },
  });
  const params = new Map(parametres.map((parametre) => [parametre.cle, parametre.valeur]));
  const client = commande.client ?? commande.client_externe;
  const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);

  return {
    societe: {
      raisonSociale: params.get("raison_sociale") ?? "Coq Plus",
      ice: params.get("ice"),
      rc: params.get("rc"),
      logo: await chargerLogoDataUri(params.get("logo_url")),
    },
    id: commande.id,
    numeroBl: commande.numero_bl,
    date: formatDateHeure(commande.date_commande),
    client: client?.nom ?? "-",
    ville: client?.region_ville ?? "-",
    commercial: commande.utilisateur.nom_complet,
    total: formatMontant(totaux.total),
    totalPaye: formatMontant(totaux.totalPaye),
    resteDu: formatMontant(totaux.resteDu),
    statut: libelleStatutPaiement(totaux.statutPaiement),
    lignes: commande.lignes.map((ligne) => ({
      produit: ligne.produit.nom,
      quantite: `${ligne.quantite.toFixed(3)} kg`,
      prixUnitaire: formatMontant(ligne.prix_unitaire),
      prixNet: formatMontant(ligne.prix_net),
    })),
  };
}

// @react-pdf/renderer n'accepte que PNG/JPG en <Image> ; les logos SVG sont
// ignores (le PDF retombe alors sur la raison sociale texte). Le fichier est lu
// depuis public/ et encode en data URI pour eviter toute dependance reseau.
const TYPES_LOGO_PDF: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function chargerLogoDataUri(cheminPublic?: string): Promise<string | undefined> {
  if (!cheminPublic || !estCheminLogoPublic(cheminPublic)) {
    return undefined;
  }

  const mime = TYPES_LOGO_PDF[path.extname(cheminPublic).toLowerCase()];
  if (!mime) {
    return undefined;
  }

  try {
    const relatif = cheminPublic.replace(/^\/+/, "").split("/");
    const cheminDisque = path.join(process.cwd(), "public", ...relatif);
    const contenu = await readFile(cheminDisque);
    return `data:${mime};base64,${contenu.toString("base64")}`;
  } catch {
    return undefined;
  }
}
