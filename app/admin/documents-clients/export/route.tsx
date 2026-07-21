import { renderToBuffer } from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { BonChargePdf } from "@/app/charges/bon-charge-pdf";
import { chargerBonChargeDocument } from "@/app/charges/document-data";
import { BonLivraisonPdf } from "@/app/commandes/bon-livraison-pdf";
import { chargerCommandeDocument } from "@/app/commandes/document-data";
import { FacturePdf } from "@/app/commandes/facture-pdf";
import { adresseIpRequete } from "@/lib/audit";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { entetesFichierPrive } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { creerZip } from "@/lib/zip";

export const runtime = "nodejs";

const DOCUMENTS_AUTORISES = ["bl", "facture", "bon_charge"] as const;
const MAX_CLIENTS = 100;
const MAX_FICHIERS = 300;

const schemaClientSelection = z.string().regex(/^(standard|externe):[A-Za-z0-9_-]+$/);
const schemaDocument = z.enum(DOCUMENTS_AUTORISES);

type TypeDocument = z.infer<typeof schemaDocument>;

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

  return normalise || "client";
}

function nomFichier({
  client,
  numero,
  type,
}: {
  client: string;
  numero: string;
  type: "BL" | "FACTURE" | "BC";
}): string {
  return `${slug(client)}/${type}-${slug(numero)}.pdf`;
}

function separerClients(selections: string[]) {
  const standards: string[] = [];
  const externes: string[] = [];

  for (const selection of selections) {
    const [type, id] = selection.split(":");
    if (type === "standard") {
      standards.push(id);
    } else if (type === "externe") {
      externes.push(id);
    }
  }

  return { standards: [...new Set(standards)], externes: [...new Set(externes)] };
}

function construireWhereCommandes({
  standards,
  externes,
  debut,
  fin,
}: {
  standards: string[];
  externes: string[];
  debut?: string;
  fin?: string;
}): Prisma.CommandeWhereInput {
  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;
  if (debut || fin) {
    if (!debut || !fin) {
      throw new Error("Periode incomplete");
    }
    bornes = bornesJourneeInclusive(debut, fin);
  }

  return {
    deleted_at: null,
    ...(bornes ? { date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
    OR: [
      ...(standards.length > 0 ? [{ client_id: { in: standards } }] : []),
      ...(externes.length > 0 ? [{ client_externe_id: { in: externes } }] : []),
    ],
  };
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const formData = await request.formData();

  const validationClients = z
    .array(schemaClientSelection)
    .min(1, "Selectionner au moins un client.")
    .max(MAX_CLIENTS, `Selectionner ${MAX_CLIENTS} clients au maximum.`)
    .safeParse(valeursFormData(formData, "clients"));

  if (!validationClients.success) {
    return reponseErreur(validationClients.error.issues[0]?.message ?? "Selection clients invalide.");
  }

  const validationDocuments = z
    .array(schemaDocument)
    .min(1, "Selectionner au moins un type de document.")
    .safeParse(valeursFormData(formData, "documents"));

  if (!validationDocuments.success) {
    return reponseErreur(
      validationDocuments.error.issues[0]?.message ?? "Selection documents invalide.",
    );
  }

  const debut = formData.get("debut");
  const fin = formData.get("fin");
  const { standards, externes } = separerClients(validationClients.data);
  const documents = [...new Set(validationDocuments.data)] as TypeDocument[];

  let where: Prisma.CommandeWhereInput;
  try {
    where = construireWhereCommandes({
      standards,
      externes,
      debut: typeof debut === "string" && debut ? debut : undefined,
      fin: typeof fin === "string" && fin ? fin : undefined,
    });
  } catch {
    return reponseErreur(
      "Periode invalide : renseigner les deux dates et verifier que la date fin est posterieure ou egale a la date debut.",
    );
  }

  const commandes = await prisma.commande.findMany({
    where,
    orderBy: [{ client: { nom: "asc" } }, { client_externe: { nom: "asc" } }, { date_commande: "desc" }],
    select: {
      id: true,
      numero_bl: true,
      client: { select: { nom: true } },
      client_externe: { select: { nom: true } },
      bon_charge: { where: { deleted_at: null }, select: { id: true, numero_bc: true } },
    },
  });

  if (commandes.length === 0) {
    return reponseErreur("Aucune commande trouvee pour les clients et la periode selectionnes.", 404);
  }

  const nombreFichiers =
    commandes.length * documents.filter((document) => document !== "bon_charge").length +
    (documents.includes("bon_charge")
      ? commandes.filter((commande) => commande.bon_charge).length
      : 0);

  if (nombreFichiers === 0) {
    return reponseErreur("Aucun document disponible pour cette selection.", 404);
  }

  if (nombreFichiers > MAX_FICHIERS) {
    return reponseErreur(
      `Selection trop volumineuse : ${nombreFichiers} fichiers. Limite actuelle : ${MAX_FICHIERS}. Filtrer par periode ou reduire le nombre de clients.`,
      413,
    );
  }

  const fichiers: Array<{ chemin: string; contenu: Uint8Array }> = [];

  for (const commande of commandes) {
    const client = commande.client?.nom ?? commande.client_externe?.nom ?? "Client inconnu";
    const commandeDocument =
      documents.includes("bl") || documents.includes("facture")
        ? await chargerCommandeDocument(commande.id)
        : undefined;

    if (documents.includes("bl") && commandeDocument) {
      const buffer = await renderToBuffer(<BonLivraisonPdf commande={commandeDocument} />);
      fichiers.push({
        chemin: nomFichier({ client, numero: commande.numero_bl, type: "BL" }),
        contenu: new Uint8Array(buffer),
      });
    }

    if (documents.includes("facture") && commandeDocument) {
      const buffer = await renderToBuffer(<FacturePdf commande={commandeDocument} />);
      fichiers.push({
        chemin: nomFichier({ client, numero: commande.numero_bl, type: "FACTURE" }),
        contenu: new Uint8Array(buffer),
      });
    }

    if (documents.includes("bon_charge") && commande.bon_charge) {
      const bon = await chargerBonChargeDocument(commande.bon_charge.id);
      const buffer = await renderToBuffer(<BonChargePdf bon={bon} />);
      fichiers.push({
        chemin: nomFichier({ client, numero: commande.bon_charge.numero_bc, type: "BC" }),
        contenu: new Uint8Array(buffer),
      });
    }
  }

  const zip = creerZip(fichiers);
  const date = new Date().toISOString().slice(0, 10);

  await prisma.auditLog.create({
    data: {
      utilisateur_id: admin.id,
      action: "documents_clients.export",
      entite: "documents_clients",
      donnees_apres: {
        clients: validationClients.data.length,
        commandes: commandes.length,
        fichiers: fichiers.length,
        documents,
      },
      ip_address: await adresseIpRequete(),
    },
  });

  return new Response(zip as BodyInit, {
    headers: entetesFichierPrive(
      "application/zip",
      `attachment; filename="documents_clients_${date}.zip"`,
    ),
  });
}
