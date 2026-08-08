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
  if (!commande.numeroFacture) {
    return new Response(
      "La facture doit d'abord etre generee depuis la commande.",
      { status: 409, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  const buffer = await renderToBuffer(<FacturePdf commande={commande} />);

  return new Response(buffer as unknown as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `inline; filename="${commande.numeroFacture}.pdf"`,
    ),
  });
}
