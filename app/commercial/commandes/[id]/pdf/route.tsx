import { renderToBuffer } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { BonLivraisonPdf } from "@/app/commandes/bon-livraison-pdf";
import { chargerCommandeDocument } from "@/app/commandes/document-data";
import { entetesFichierPrive } from "@/lib/http";
import { adresseIpRequete } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireCommercial } from "@/lib/session";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const commercial = await requireCommercial();
  const { id } = await params;
  const commande = await chargerCommandeDocument(id, commercial.id);
  const buffer = await renderToBuffer(<BonLivraisonPdf commande={commande} />);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.telechargementDocument.create({
        data: {
          utilisateur_id: commercial.id,
          commande_id: id,
          type_document: "BL",
          ip_address: await adresseIpRequete(),
        },
      });
      await tx.auditLog.create({
        data: {
          utilisateur_id: commercial.id,
          action: "document.bl_telechargement_commercial",
          entite: "commandes",
          entite_id: id,
          donnees_apres: { numero_bl: commande.numeroBl },
        },
      });
    });
  } catch (erreur) {
    if (
      erreur instanceof Prisma.PrismaClientKnownRequestError &&
      erreur.code === "P2002"
    ) {
      return new Response(
        "Ce BL a deja ete telecharge une fois. Demandez-le a l'administrateur.",
        { status: 409, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }
    throw erreur;
  }

  return new Response(buffer as unknown as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `inline; filename="${commande.numeroBl}.pdf"`,
    ),
  });
}
