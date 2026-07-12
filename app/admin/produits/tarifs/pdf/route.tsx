import { renderToBuffer } from "@react-pdf/renderer";
import { chargerTarifsDocument } from "@/app/produits/tarifs-data";
import { TarifsPdf } from "@/app/produits/tarifs-pdf";
import { entetesFichierPrive } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();
  const data = await chargerTarifsDocument();
  const buffer = await renderToBuffer(<TarifsPdf data={data} />);

  return new Response(buffer as unknown as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `inline; filename="tarifs-produits-${data.date.replaceAll("/", "-")}.pdf"`,
    ),
  });
}
