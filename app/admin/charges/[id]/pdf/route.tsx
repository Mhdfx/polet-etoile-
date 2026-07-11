import { renderToBuffer } from "@react-pdf/renderer";
import { BonChargePdf } from "@/app/charges/bon-charge-pdf";
import { chargerBonChargeDocument } from "@/app/charges/document-data";
import { entetesFichierPrive } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  await requireAdmin();
  const { id } = await params;
  const bon = await chargerBonChargeDocument(id);
  const buffer = await renderToBuffer(<BonChargePdf bon={bon} />);

  return new Response(buffer as unknown as BodyInit, {
    headers: entetesFichierPrive(
      "application/pdf",
      `attachment; filename="${bon.numeroBc}.pdf"`,
    ),
  });
}
