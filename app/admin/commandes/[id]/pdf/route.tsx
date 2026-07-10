import { renderToBuffer } from "@react-pdf/renderer";
import { BonLivraisonPdf } from "@/app/commandes/bon-livraison-pdf";
import { chargerCommandeDocument } from "@/app/commandes/document-data";
import { entetesFichierPrive } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  await requireAdmin();
  const { id } = await params;
  const commande = await chargerCommandeDocument(id);
  const buffer = await renderToBuffer(<BonLivraisonPdf commande={commande} />);

  return new Response(buffer as unknown as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `inline; filename="${commande.numeroBl}.pdf"`,
    ),
  });
}
