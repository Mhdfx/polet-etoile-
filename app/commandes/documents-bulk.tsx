import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { Prisma, type TypeDocumentTelecharge } from "@prisma/client";
import { chargerBonChargeConsolide } from "@/app/charges/bon-charge-consolide-data";
import { BonChargeConsolidePdf } from "@/app/charges/bon-charge-consolide-pdf";
import { assurerBonChargeDepuisCommande } from "@/app/charges/bon-charge-depuis-commande";
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
import { fusionnerPdfs } from "@/app/commandes/fusion-pdf";
import { adresseIpRequete } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { entetesFichierPrive } from "@/lib/http";
import type { UtilisateurSession } from "@/lib/session";

const MAX_DOCUMENTS_PDF = 300;

function reponseErreur(message: string, status = 400): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
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
 * PDF sans faire echouer tout l'export : les BL et les autres bons restent
 * livres, et le bon consolide signale les bons non inclus.
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

async function chargerBlDejaTelecharges(
  commandes: CommandeSelectionnee[],
): Promise<Map<string, Date>> {
  const telechargements = await prisma.telechargementDocument.findMany({
    where: {
      type_document: "BL",
      commande_id: { in: commandes.map((commande) => commande.id) },
    },
    select: { commande_id: true, created_at: true },
  });

  return new Map(
    telechargements.map((telechargement) => [
      telechargement.commande_id,
      telechargement.created_at,
    ]),
  );
}

/**
 * Pages PDF par commande : BL puis facture pour chaque commande selectionnee.
 * Elles seront fusionnees avec le bon de charge consolide dans un seul fichier.
 */
async function construirePdfsCommande({
  commandes,
  commandesBl,
  documents,
}: {
  commandes: CommandeSelectionnee[];
  commandesBl: CommandeSelectionnee[];
  documents: DocumentCommande[];
}): Promise<Uint8Array[]> {
  const pdfs: Uint8Array[] = [];
  if (!documents.includes("bl") && !documents.includes("facture")) {
    return pdfs;
  }

  const idsBl = new Set(commandesBl.map((commande) => commande.id));
  for (const commande of commandes) {
    const inclutBl = documents.includes("bl") && idsBl.has(commande.id);
    const inclutFacture = documents.includes("facture");
    if (!inclutBl && !inclutFacture) continue;

    const commandeDocument = await chargerCommandeDocument(commande.id);

    if (inclutBl) {
      const buffer = await renderToBuffer(<BonLivraisonPdf commande={commandeDocument} />);
      pdfs.push(new Uint8Array(buffer));
    }

    if (documents.includes("facture")) {
      const buffer = await renderToBuffer(<FacturePdf commande={commandeDocument} />);
      pdfs.push(new Uint8Array(buffer));
    }
  }

  return pdfs;
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
  commandesBl,
  bonsChargeInclus,
  fichiers,
  ip,
}: {
  utilisateur: UtilisateurSession;
  portee: PorteeExport;
  documents: DocumentCommande[];
  commandes: CommandeSelectionnee[];
  commandesBl: CommandeSelectionnee[];
  bonsChargeInclus: BonChargeInclus[];
  fichiers: number;
  ip: string | null;
}): Promise<Response | null> {
  const telechargementsBl =
    portee === "commercial" && documents.includes("bl") ? commandesBl : [];
  // Seuls les bons de charge reellement inclus dans le PDF sont marques comme
  // telecharges (les bons deja consommes ont ete sautes, pas re-livres).
  const telechargementsBonCharge =
    portee === "commercial" && documents.includes("bon_charge")
      ? bonsChargeInclus
      : [];

  try {
    await prisma.$transaction(async (tx) => {
      const telechargements: Array<{
        utilisateur_id: string;
        commande_id: string;
        bon_charge_id: string | null;
        type_document: TypeDocumentTelecharge;
        ip_address: string | null;
      }> = [
        ...telechargementsBl.map((commande) => ({
          utilisateur_id: utilisateur.id,
          commande_id: commande.id,
          bon_charge_id: null,
          type_document: "BL" as TypeDocumentTelecharge,
          ip_address: ip,
        })),
        ...telechargementsBonCharge.map((telechargement) => ({
          utilisateur_id: utilisateur.id,
          commande_id: telechargement.commandeId,
          bon_charge_id: telechargement.bonChargeId,
          type_document: "BON_CHARGE" as TypeDocumentTelecharge,
          ip_address: ip,
        })),
      ];
      if (telechargements.length > 0) {
        await tx.telechargementDocument.createMany({
          data: telechargements,
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
        "Un BL ou bon de charge selectionne a deja ete telecharge. Rechargez la page et demandez-le a l'administrateur.",
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

  let commandes = await chargerCommandesSelectionnees({
    ids,
    portee,
    utilisateurId: utilisateur.id,
  });
  if (commandes instanceof Response) {
    return commandes;
  }

  const veutBonCharge = documents.includes("bon_charge");
  const ip = await lireIpRequete();

  // Un export BC peut aussi servir de generation : chaque bon manquant est cree
  // sous verrou avant de construire le PDF. Cote commercial, la propriete est
  // reverifiee dans la requete verrouillee. Les commandes sont triees avant les
  // verrous afin d'eviter les interblocages lors de deux exports concurrents.
  if (veutBonCharge) {
    const commandesSansBon = commandes
      .filter((commande) => !commande.bon_charge)
      .map((commande) => commande.id)
      .sort();

    if (commandesSansBon.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const commandeId of commandesSansBon) {
          await assurerBonChargeDepuisCommande(tx, {
            commandeId,
            acteurId: utilisateur.id,
            ...(portee === "commercial"
              ? { commercialIdAttendu: utilisateur.id }
              : {}),
            ip,
            actionAudit:
              portee === "commercial"
                ? "bon_charge.creation_automatique_commercial"
                : "bon_charge.creation_automatique_export_admin",
          });
        }
      });

      commandes = await chargerCommandesSelectionnees({
        ids,
        portee,
        utilisateurId: utilisateur.id,
      });
      if (commandes instanceof Response) {
        return commandes;
      }
    }
  }

  let commandesBl = commandes;
  if (portee === "commercial" && documents.includes("bl")) {
    const blDejaTelecharges = await chargerBlDejaTelecharges(commandes);
    commandesBl = commandes.filter((commande) => !blDejaTelecharges.has(commande.id));
    if (documents.length === 1 && commandesBl.length === 0) {
      return reponseErreur(
        "Tous les BL selectionnes ont deja ete telecharges. Demandez-les a l'administrateur.",
        409,
      );
    }
  }

  const bonsDeChargeDejaTelecharges =
    portee === "commercial" && veutBonCharge
      ? await chargerBonsDeChargeDejaTelecharges(commandes)
      : new Set<string>();

  // PDF par commande (BL / facture).
  const pdfs = await construirePdfsCommande({ commandes, commandesBl, documents });

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

  if (pdfConsolide) {
    pdfs.push(pdfConsolide);
  }

  if (pdfs.length === 0) {
    return reponseErreur(
      "Aucun document disponible pour les commandes selectionnees.",
      404,
    );
  }

  if (pdfs.length > MAX_DOCUMENTS_PDF) {
    return reponseErreur(
      `Selection trop volumineuse : ${pdfs.length} documents. Limite actuelle : ${MAX_DOCUMENTS_PDF}. Reduire le nombre de commandes.`,
      413,
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const nombreCommandes = commandes.length;
  const libelleNombreCommandes = `${nombreCommandes} commande${nombreCommandes > 1 ? "s" : ""}`;
  const titre =
    portee === "admin"
      ? `Dossier documents commandes - ${libelleNombreCommandes}`
      : `Dossier documents commercial - ${libelleNombreCommandes}`;
  const corps = await fusionnerPdfs(pdfs, titre);
  const prefixe =
    portee === "admin" ? "dossier_commandes" : "mes_documents_commandes";
  const filename = `${prefixe}_${nombreCommandes}_commande${nombreCommandes > 1 ? "s" : ""}_${date}.pdf`;
  const nombreFichiers = pdfs.length;

  const erreurEnregistrement = await enregistrerAuditEtTelechargements({
    utilisateur,
    portee,
    documents,
    commandes,
    commandesBl,
    bonsChargeInclus,
    fichiers: nombreFichiers,
    ip,
  });
  if (erreurEnregistrement) {
    return erreurEnregistrement;
  }

  return new Response(corps as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `attachment; filename="${filename}"`,
    ),
  });
}
