import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { Prisma, type TypeDocumentTelecharge } from "@prisma/client";
import { chargerBonChargeConsolide } from "@/app/charges/bon-charge-consolide-data";
import { BonChargeConsolidePdf } from "@/app/charges/bon-charge-consolide-pdf";
import { BonLivraisonPdf } from "@/app/commandes/bon-livraison-pdf";
import { chargerCommandeDocument } from "@/app/commandes/document-data";
import {
  noteExclusions,
  preparerConsolide,
  type BonChargeInclus,
  type CommandeSelectionnee,
} from "@/app/commandes/documents-bulk-selection";
import {
  validerCommandesDocuments,
  validerTypesDocuments,
  type DocumentCommande,
  type PorteeExport,
} from "@/app/commandes/documents-bulk-validation";
import { FacturePdf } from "@/app/commandes/facture-pdf";
import { adresseIpRequete } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { entetesFichierPrive } from "@/lib/http";
import type { UtilisateurSession } from "@/lib/session";
import { creerZip } from "@/lib/zip";

const MAX_FICHIERS = 300;

function reponseErreur(message: string, status = 400): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function slug(valeur: string): string {
  const normalise = valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalise || "document";
}

function cheminDocument(commande: CommandeSelectionnee, nom: string): string {
  return `${slug(commande.numero_bl)}/${nom}`;
}

async function chargerCommandesSelectionnees({
  ids,
  portee,
  utilisateurId,
}: {
  ids: string[];
  portee: PorteeExport;
  utilisateurId: string;
}): Promise<CommandeSelectionnee[] | Response> {
  const commandes = await prisma.commande.findMany({
    where: {
      id: { in: ids },
      deleted_at: null,
      ...(portee === "commercial" ? { utilisateur_id: utilisateurId } : {}),
    },
    select: {
      id: true,
      numero_bl: true,
      bon_charge: {
        where: { deleted_at: null },
        select: { id: true, numero_bc: true },
      },
    },
  });

  if (commandes.length !== ids.length) {
    return reponseErreur(
      portee === "commercial"
        ? "Certaines commandes sont introuvables ou ne vous appartiennent pas."
        : "Certaines commandes sont introuvables.",
      portee === "commercial" ? 403 : 404,
    );
  }

  const ordre = new Map(ids.map((id, index) => [id, index]));
  return commandes.sort((a, b) => (ordre.get(a.id) ?? 0) - (ordre.get(b.id) ?? 0));
}

/**
 * Ensemble des bons de charge deja telecharges au moins une fois (regle
 * commerciale : telechargement commercial unique). Sert a exclure ces bons du
 * ZIP sans faire echouer tout l'export : les BL et les autres bons restent
 * livres, et un fichier note signale les bons non inclus.
 */
async function chargerBonsDeChargeDejaTelecharges(
  commandes: CommandeSelectionnee[],
): Promise<Set<string>> {
  const bonChargeIds = commandes
    .map((commande) => commande.bon_charge?.id)
    .filter((id): id is string => Boolean(id));

  if (bonChargeIds.length === 0) {
    return new Set();
  }

  const telechargements = await prisma.telechargementDocument.findMany({
    where: {
      type_document: "BON_CHARGE",
      bon_charge_id: { in: bonChargeIds },
    },
    select: { bon_charge_id: true },
  });

  return new Set(
    telechargements
      .map((telechargement) => telechargement.bon_charge_id)
      .filter((id): id is string => Boolean(id)),
  );
}

type Fichier = { chemin: string; contenu: Uint8Array };
/**
 * Fichiers par commande : BL et facture (un fichier par commande, dans un
 * dossier au numero de BL). Le bon de charge n'est plus un fichier par commande
 * mais un document consolide unique (voir preparerConsolide + BonChargeConsolidePdf).
 */
async function construireFichiersCommande({
  commandes,
  documents,
}: {
  commandes: CommandeSelectionnee[];
  documents: DocumentCommande[];
}): Promise<Fichier[]> {
  const fichiers: Fichier[] = [];
  if (!documents.includes("bl") && !documents.includes("facture")) {
    return fichiers;
  }

  for (const commande of commandes) {
    const commandeDocument = await chargerCommandeDocument(commande.id);

    if (documents.includes("bl")) {
      const buffer = await renderToBuffer(<BonLivraisonPdf commande={commandeDocument} />);
      fichiers.push({
        chemin: cheminDocument(commande, `BL-${slug(commande.numero_bl)}.pdf`),
        contenu: new Uint8Array(buffer),
      });
    }

    if (documents.includes("facture")) {
      const buffer = await renderToBuffer(<FacturePdf commande={commandeDocument} />);
      fichiers.push({
        chemin: cheminDocument(commande, `FACTURE-${slug(commande.numero_bl)}.pdf`),
        contenu: new Uint8Array(buffer),
      });
    }
  }

  return fichiers;
}

/**
 * Determine, pour le bon de charge consolide, les commandes a agreger, celles
 * exclues (regle commerciale une-seule-fois) et les bons de charge a verrouiller.
 * L'admin n'est jamais limite ; un commercial ne peut inclure qu'une fois le bon
 * de charge d'une commande donnee.
 */
async function enregistrerAuditEtTelechargements({
  utilisateur,
  portee,
  documents,
  commandes,
  bonsChargeInclus,
  fichiers,
  ip,
}: {
  utilisateur: UtilisateurSession;
  portee: PorteeExport;
  documents: DocumentCommande[];
  commandes: CommandeSelectionnee[];
  bonsChargeInclus: BonChargeInclus[];
  fichiers: number;
  ip: string | null;
}): Promise<Response | null> {
  // Seuls les bons de charge reellement inclus dans le ZIP sont marques comme
  // telecharges (les bons deja consommes ont ete sautes, pas re-livres).
  const telechargementsBonCharge =
    portee === "commercial" && documents.includes("bon_charge")
      ? bonsChargeInclus
      : [];

  try {
    await prisma.$transaction(async (tx) => {
      if (telechargementsBonCharge.length > 0) {
        await tx.telechargementDocument.createMany({
          data: telechargementsBonCharge.map((telechargement) => ({
            utilisateur_id: utilisateur.id,
            commande_id: telechargement.commandeId,
            bon_charge_id: telechargement.bonChargeId,
            type_document: "BON_CHARGE" satisfies TypeDocumentTelecharge,
            ip_address: ip,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          utilisateur_id: utilisateur.id,
          action:
            portee === "admin"
              ? "documents_commandes.export_admin"
              : "documents_commandes.export_commercial",
          entite: "commandes",
          donnees_apres: {
            portee,
            commandes: commandes.map((commande) => commande.numero_bl),
            documents,
            fichiers,
            bons_charge_verrouilles: telechargementsBonCharge.length,
          },
          ip_address: ip,
        },
      });
    });
  } catch (erreur) {
    if (
      erreur instanceof Prisma.PrismaClientKnownRequestError &&
      erreur.code === "P2002"
    ) {
      return reponseErreur(
        "Un bon de charge selectionne vient deja d'etre telecharge. Rechargez la page et recommencez.",
        409,
      );
    }

    throw erreur;
  }

  return null;
}

async function lireIpRequete(): Promise<string | null> {
  try {
    return await adresseIpRequete();
  } catch {
    return null;
  }
}

export async function exporterDocumentsCommandes({
  request,
  utilisateur,
  portee,
}: {
  request: Request;
  utilisateur: UtilisateurSession;
  portee: PorteeExport;
}): Promise<Response> {
  const formData = await request.formData();
  const ids = validerCommandesDocuments(formData);
  if (ids instanceof Response) {
    return ids;
  }

  const documents = validerTypesDocuments(formData, portee);
  if (documents instanceof Response) {
    return documents;
  }

  const commandes = await chargerCommandesSelectionnees({
    ids,
    portee,
    utilisateurId: utilisateur.id,
  });
  if (commandes instanceof Response) {
    return commandes;
  }

  const veutBonCharge = documents.includes("bon_charge");

  const bonsDeChargeDejaTelecharges =
    portee === "commercial" && veutBonCharge
      ? await chargerBonsDeChargeDejaTelecharges(commandes)
      : new Set<string>();

  // Fichiers par commande (BL / facture).
  const fichiers = await construireFichiersCommande({ commandes, documents });

  // Bon de charge consolide : un seul PDF pour toutes les commandes retenues.
  let pdfConsolide: Uint8Array | undefined;
  let bonsChargeInclus: BonChargeInclus[] = [];
  if (veutBonCharge) {
    const { inclues, exclues, bonsChargeInclus: marques } = preparerConsolide({
      commandes,
      portee,
      bonsDeChargeDejaTelecharges,
    });
    bonsChargeInclus = marques;

    const data = await chargerBonChargeConsolide({
      commandeIds: inclues.map((commande) => commande.id),
      note: noteExclusions(exclues),
    });

    if (data) {
      const buffer = await renderToBuffer(<BonChargeConsolidePdf data={data} />);
      pdfConsolide = new Uint8Array(buffer);
    } else if (documents.length === 1) {
      // Seul le bon de charge etait demande mais il n'y a rien a inclure.
      const tousDejaTelecharges =
        exclues.length > 0 &&
        exclues.every((exclusion) => exclusion.raison === "deja_telecharge");
      return reponseErreur(
        tousDejaTelecharges
          ? "Bon de charge consolide vide : toutes les commandes selectionnees ont deja ete telechargees. Demandez le document a l'administrateur."
          : "Aucun bon de charge disponible pour les commandes selectionnees.",
        tousDejaTelecharges ? 409 : 404,
      );
    }
  }

  // Packaging : un seul PDF si le bon de charge consolide est le seul document,
  // sinon un ZIP (BL/facture par commande + bon de charge consolide a la racine).
  const seulementConsolide =
    veutBonCharge && documents.length === 1 && fichiers.length === 0;

  let corps: Uint8Array;
  let contentType: string;
  let filename: string;
  let nombreFichiers: number;
  const date = new Date().toISOString().slice(0, 10);

  if (seulementConsolide && pdfConsolide) {
    corps = pdfConsolide;
    contentType = "application/pdf";
    filename = `bon-de-charge-consolide_${date}.pdf`;
    nombreFichiers = 1;
  } else {
    if (pdfConsolide) {
      fichiers.push({ chemin: "BON-DE-CHARGE.pdf", contenu: pdfConsolide });
    }

    if (fichiers.length === 0) {
      return reponseErreur(
        "Aucun document disponible pour les commandes selectionnees.",
        404,
      );
    }

    if (fichiers.length > MAX_FICHIERS) {
      return reponseErreur(
        `Selection trop volumineuse : ${fichiers.length} fichiers. Limite actuelle : ${MAX_FICHIERS}. Reduire le nombre de commandes.`,
        413,
      );
    }

    corps = creerZip(fichiers);
    contentType = "application/zip";
    const prefixe = portee === "admin" ? "documents_commandes" : "mes_documents_commandes";
    filename = `${prefixe}_${date}.zip`;
    nombreFichiers = fichiers.length;
  }

  const ip = await lireIpRequete();
  const erreurEnregistrement = await enregistrerAuditEtTelechargements({
    utilisateur,
    portee,
    documents,
    commandes,
    bonsChargeInclus,
    fichiers: nombreFichiers,
    ip,
  });
  if (erreurEnregistrement) {
    return erreurEnregistrement;
  }

  return new Response(corps as BodyInit, {
    headers: entetesFichierPrive(
      contentType,
      `attachment; filename="${filename}"`,
    ),
  });
}
