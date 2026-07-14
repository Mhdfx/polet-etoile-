import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound, redirect } from "next/navigation";
import Decimal from "decimal.js";
import { calculerTotauxCommande, libelleStatutPaiement } from "@/lib/commandes-vue";
import { prisma } from "@/lib/db";
import { formatDate, formatMontant, formatQuantite } from "@/lib/format";
import { estCheminLogoPublic } from "@/lib/logo-upload";

export type CommandeDocumentData = {
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
  id: string;
  numeroBl: string;
  date: string;
  client: string;
  codeClient: string;
  ville: string;
  adresseClient: string;
  commercial: string;
  totalHt: string;
  tva: string;
  totalTtc: string;
  totalPaye: string;
  resteDu: string;
  statut: string;
  tauxTva: string;
  montantEnLettres: string;
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
      client: { select: { id: true, nom: true, region_ville: true, adresse: true } },
      client_externe: { select: { id: true, nom: true, region_ville: true, adresse: true } },
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

  if (!commande && commercialId) {
    redirect("/403");
  }

  if (!commande) {
    notFound();
  }

  if (commercialId && commande.utilisateur_id !== commercialId) {
    redirect("/403");
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
          "taux_tva",
        ],
      },
    },
    select: { cle: true, valeur: true },
  });
  const params = new Map(parametres.map((parametre) => [parametre.cle, parametre.valeur]));
  const client = commande.client ?? commande.client_externe;
  const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);
  const tauxTva = new Decimal(params.get("taux_tva") || "0");
  const totalTtc = new Decimal(totaux.total);
  const totalHt = tauxTva.eq(0)
    ? totalTtc
    : totalTtc.div(tauxTva.div(100).plus(1)).toDecimalPlaces(2);
  const montantTva = totalTtc.minus(totalHt);

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
      cachet: await chargerCachetDataUri(),
    },
    id: commande.id,
    numeroBl: commande.numero_bl,
    date: formatDate(commande.date_commande),
    client: client?.nom ?? "-",
    codeClient: client ? codeClientDocument(client.id, Boolean(commande.client_externe)) : "",
    ville: client?.region_ville ?? "-",
    adresseClient: client?.adresse ?? "-",
    commercial: commande.utilisateur.nom_complet,
    totalHt: formatMontantPdf(totalHt),
    tva: formatMontantPdf(montantTva),
    totalTtc: formatMontantPdf(totalTtc),
    totalPaye: formatMontant(totaux.totalPaye),
    resteDu: formatMontant(totaux.resteDu),
    statut: libelleStatutPaiement(totaux.statutPaiement),
    tauxTva: tauxTva.toFixed(tauxTva.isInteger() ? 0 : 2),
    montantEnLettres: montantEnLettres(totalTtc),
    lignes: commande.lignes.map((ligne) => ({
      produit: ligne.produit.nom,
      quantite: formatQuantitePdf(ligne.quantite),
      prixUnitaire: formatMontantPdf(ligne.prix_unitaire),
      prixNet: formatMontantPdf(ligne.prix_net),
    })),
  };
}

function formatMontantPdf(valeur: Decimal.Value): string {
  return formatMontant(valeur).replace(/\s?DH$/, "");
}

function formatQuantitePdf(valeur: Decimal.Value): string {
  return formatQuantite(valeur).replace(/\s?kg$/, "");
}

function codeClientDocument(id: string, externe: boolean): string {
  const chiffres = [...id].reduce((total, caractere) => total + caractere.charCodeAt(0), 0);
  return `${externe ? "EX" : "CL"}${String(chiffres % 10000).padStart(4, "0")}`;
}

const UNITES = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
] as const;

const DIZAINES = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
] as const;

function nombreInfCent(nombre: number): string {
  if (nombre < 17) return UNITES[nombre];
  if (nombre < 20) return `dix-${UNITES[nombre - 10]}`;
  if (nombre < 70) {
    const dizaine = Math.floor(nombre / 10);
    const unite = nombre % 10;
    if (unite === 0) return DIZAINES[dizaine];
    if (unite === 1) return `${DIZAINES[dizaine]} et un`;
    return `${DIZAINES[dizaine]}-${UNITES[unite]}`;
  }
  if (nombre < 80) {
    const reste = nombre - 60;
    return reste === 11 ? "soixante et onze" : `soixante-${nombreInfCent(reste)}`;
  }
  if (nombre === 80) return "quatre-vingts";
  return `quatre-vingt-${nombreInfCent(nombre - 80)}`;
}

function nombreInfMille(nombre: number): string {
  if (nombre < 100) return nombreInfCent(nombre);
  const centaines = Math.floor(nombre / 100);
  const reste = nombre % 100;
  const prefixe = centaines === 1 ? "cent" : `${UNITES[centaines]} cent`;
  if (reste === 0) return centaines > 1 ? `${prefixe}s` : prefixe;
  return `${prefixe} ${nombreInfCent(reste)}`;
}

function nombreEnLettres(nombre: number): string {
  if (nombre === 0) return "zero";
  if (nombre < 1000) return nombreInfMille(nombre);
  if (nombre < 1_000_000) {
    const milliers = Math.floor(nombre / 1000);
    const reste = nombre % 1000;
    const prefixe = milliers === 1 ? "mille" : `${nombreInfMille(milliers)} mille`;
    return reste === 0 ? prefixe : `${prefixe} ${nombreInfMille(reste)}`;
  }
  const millions = Math.floor(nombre / 1_000_000);
  const reste = nombre % 1_000_000;
  const prefixe = `${nombreInfMille(millions)} million${millions > 1 ? "s" : ""}`;
  return reste === 0 ? prefixe : `${prefixe} ${nombreEnLettres(reste)}`;
}

function montantEnLettres(total: Decimal): string {
  const arrondi = total.toDecimalPlaces(2);
  const dirhams = arrondi.floor().toNumber();
  const centimes = arrondi.minus(dirhams).mul(100).round().toNumber();
  const dirhamsTexte = `${nombreEnLettres(dirhams)} dirham${dirhams > 1 ? "s" : ""}`;
  if (centimes === 0) {
    return dirhamsTexte.charAt(0).toUpperCase() + dirhamsTexte.slice(1);
  }
  const texte = `${dirhamsTexte} et ${nombreEnLettres(centimes)} centime${
    centimes > 1 ? "s" : ""
  }`;
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// @react-pdf/renderer n'accepte que PNG/JPG en <Image> ; les logos SVG sont
// ignores (le PDF retombe alors sur la raison sociale texte). Le fichier est lu
// depuis public/ et encode en data URI pour eviter toute dependance reseau.
const TYPES_LOGO_PDF: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function chargerLogoDataUri(cheminPublic?: string): Promise<string | undefined> {
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

export async function chargerCachetDataUri(): Promise<string | undefined> {
  try {
    const cheminDisque = path.join(process.cwd(), "public", "cachet.png");
    const contenu = await readFile(cheminDisque);
    return `data:image/png;base64,${contenu.toString("base64")}`;
  } catch {
    return undefined;
  }
}
