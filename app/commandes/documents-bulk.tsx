import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { Prisma, type TypeDocumentTelecharge } from "@prisma/client";
import { BonChargePdf } from "@/app/charges/bon-charge-pdf";
import { chargerBonChargeDocument } from "@/app/charges/document-data";
import { BonLivraisonPdf } from "@/app/commandes/bon-livraison-pdf";
import { chargerCommandeDocument } from "@/app/commandes/document-data";
import { FacturePdf } from "@/app/commandes/facture-pdf";
import { adresseIpRequete } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { entetesFichierPrive } from "@/lib/http";
import type { UtilisateurSession } from "@/lib/session";
import { creerZip } from "@/lib/zip";

const DOCUMENTS_ADMIN = ["bl", "facture", "bon_charge"] as const;
const DOCUMENTS_COMMERCIAL = ["bl", "bon_charge"] as const;
const MAX_COMMANDES = 100;
const MAX_FICHIERS = 300;

type DocumentCommande = (typeof DOCUMENTS_ADMIN)[number];
type PorteeExport = "admin" | "commercial";

type CommandeSelectionnee = {
  id: string;
  numero_bl: string;
  bon_charge: { id: string; numero_bc: string } | null;
};

const schemaId = /^[A-Za-z0-9_-]+$/;

function valeursFormData(formData: FormData, cle: string): string[] {
  return formData.getAll(cle).filter((valeur): valeur is string => typeof valeur === "string");
}

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

function validerCommandes(formData: FormData): string[] | Response {
  const ids = [...new Set(valeursFormData(formData, "commandeIds"))];

  if (ids.length === 0) {
    return reponseErreur("Selectionner au moins une commande.");
  }

  if (ids.length > MAX_COMMANDES) {
    return reponseErreur(`Selectionner ${MAX_COMMANDES} commandes au maximum.`);
  }

  if (ids.some((id) => !schemaId.test(id))) {
    return reponseErreur("Selection de commandes invalide.");
  }

  return ids;
}

function validerDocuments(
  formData: FormData,
  portee: PorteeExport,
): DocumentCommande[] | Response {
  const valeurs = [...new Set(valeursFormData(formData, "documents"))];
  const autorises = portee === "admin" ? DOCUMENTS_ADMIN : DOCUMENTS_COMMERCIAL;
  const documents = valeurs.filter((valeur): valeur is DocumentCommande =>
    (autorises as readonly string[]).includes(valeur),
  );

  if (documents.length === 0) {
    return reponseErreur("Selectionner au moins un type de document autorise.");
  }

  if (documents.length !== valeurs.length) {
    return reponseErreur("Selection de documents invalide.", 403);
  }

  return documents;
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

async function verifierBonsDeChargeNonTelecharges(
  commandes: CommandeSelectionnee[],
): Promise<Response | null> {
  const bonChargeIds = commandes
    .map((commande) => commande.bon_charge?.id)
    .filter((id): id is string => Boolean(id));

  if (bonChargeIds.length === 0) {
    return null;
  }

  const telechargements = await prisma.telechargementDocument.findMany({
    where: {
      type_document: "BON_CHARGE",
      bon_charge_id: { in: bonChargeIds },
    },
    select: {
      bon_charge: { select: { numero_bc: true } },
      commande: { select: { numero_bl: true } },
    },
  });

  if (telechargements.length === 0) {
    return null;
  }

  const numeros = telechargements
    .map(
      (telechargement) =>
        `${telechargement.bon_charge?.numero_bc ?? "BC"} (${telechargement.commande.numero_bl})`,
    )
    .join(", ");

  return reponseErreur(
    `Bon de charge deja telecharge par un commercial : ${numeros}. Demandez a l'administrateur de fournir le document.`,
    409,
  );
}

async function construireFichiers({
  commandes,
  documents,
}: {
  commandes: CommandeSelectionnee[];
  documents: DocumentCommande[];
}) {
  const fichiers: Array<{ chemin: string; contenu: Uint8Array }> = [];
  const veutCommandeDocument = documents.includes("bl") || documents.includes("facture");

  for (const commande of commandes) {
    const commandeDocument = veutCommandeDocument
      ? await chargerCommandeDocument(commande.id)
      : undefined;

    if (documents.includes("bl") && commandeDocument) {
      const buffer = await renderToBuffer(<BonLivraisonPdf commande={commandeDocument} />);
      fichiers.push({
        chemin: cheminDocument(commande, `BL-${slug(commande.numero_bl)}.pdf`),
        contenu: new Uint8Array(buffer),
      });
    }

    if (documents.includes("facture") && commandeDocument) {
      const buffer = await renderToBuffer(<FacturePdf commande={commandeDocument} />);
      fichiers.push({
        chemin: cheminDocument(commande, `FACTURE-${slug(commande.numero_bl)}.pdf`),
        contenu: new Uint8Array(buffer),
      });
    }

    if (documents.includes("bon_charge") && commande.bon_charge) {
      const bon = await chargerBonChargeDocument(commande.bon_charge.id);
      const buffer = await renderToBuffer(<BonChargePdf bon={bon} />);
      fichiers.push({
        chemin: cheminDocument(commande, `BON-CHARGE-${slug(commande.bon_charge.numero_bc)}.pdf`),
        contenu: new Uint8Array(buffer),
      });
    }
  }

  return fichiers;
}

function bonsDeChargeAEnregistrer(commandes: CommandeSelectionnee[]) {
  return commandes.flatMap((commande) =>
    commande.bon_charge
      ? [
          {
            commandeId: commande.id,
            bonChargeId: commande.bon_charge.id,
          },
        ]
      : [],
  );
}

async function enregistrerAuditEtTelechargements({
  utilisateur,
  portee,
  documents,
  commandes,
  fichiers,
  ip,
}: {
  utilisateur: UtilisateurSession;
  portee: PorteeExport;
  documents: DocumentCommande[];
  commandes: CommandeSelectionnee[];
  fichiers: number;
  ip: string | null;
}): Promise<Response | null> {
  const telechargementsBonCharge =
    portee === "commercial" && documents.includes("bon_charge")
      ? bonsDeChargeAEnregistrer(commandes)
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
  const ids = validerCommandes(formData);
  if (ids instanceof Response) {
    return ids;
  }

  const documents = validerDocuments(formData, portee);
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

  if (portee === "commercial" && documents.includes("bon_charge")) {
    const erreurTelechargement = await verifierBonsDeChargeNonTelecharges(commandes);
    if (erreurTelechargement) {
      return erreurTelechargement;
    }
  }

  const fichiers = await construireFichiers({ commandes, documents });

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

  const ip = await lireIpRequete();
  const erreurEnregistrement = await enregistrerAuditEtTelechargements({
    utilisateur,
    portee,
    documents,
    commandes,
    fichiers: fichiers.length,
    ip,
  });
  if (erreurEnregistrement) {
    return erreurEnregistrement;
  }

  const zip = creerZip(fichiers);
  const date = new Date().toISOString().slice(0, 10);
  const prefixe = portee === "admin" ? "documents_commandes" : "mes_documents_commandes";

  return new Response(zip as BodyInit, {
    headers: entetesFichierPrive(
      "application/zip",
      `attachment; filename="${prefixe}_${date}.zip"`,
    ),
  });
}
