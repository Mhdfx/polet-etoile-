import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { BonLivraisonPdf } from "@/app/commandes/bon-livraison-pdf";
import { chargerCommandeDocument } from "@/app/commandes/document-data";
import { entetesFichierPrive } from "@/lib/http";
import { adresseIpRequete } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireCommercial } from "@/lib/session";

type RouteProps = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteProps) {
  const commercial = await requireCommercial();
  const { id } = await params;
  const commande = await chargerCommandeDocument(id, commercial.id);
  const buffer = await renderToBuffer(
    createElement(BonLivraisonPdf, { commande }) as Parameters<
      typeof renderToBuffer
    >[0],
  );

  await prisma.auditLog.create({
    data: {
      utilisateur_id: commercial.id,
      action: "document.bl_telechargement_commercial",
      entite: "commandes",
      entite_id: id,
      donnees_apres: { numero_bl: commande.numeroBl },
      ip_address: await adresseIpRequete(),
    },
  });

  return new Response(buffer as unknown as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `inline; filename="${commande.numeroBl}.pdf"`,
    ),
  });
}

export function GET() {
  return new Response(
    "Utilisez le bouton de telechargement depuis la commande.",
    {
      status: 405,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        allow: "POST",
      },
    },
  );
}
