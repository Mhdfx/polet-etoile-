import { renderToBuffer } from "@react-pdf/renderer";
import { chargerCommandeDocument } from "@/app/commandes/document-data";
import { FacturePdf } from "@/app/commandes/facture-pdf";
import { entetesFichierPrive } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  await requireAdmin();
  const { id } = await params;
  const commande = await chargerCommandeDocument(id);
  const buffer = await renderToBuffer(<FacturePdf commande={commande} />);

  return new Response(buffer as unknown as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `inline; filename="FACTURE-${commande.numeroBl}.pdf"`,
    ),
  });
}
