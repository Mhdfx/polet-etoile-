import { exporterDocumentsCommandes } from "@/app/commandes/documents-bulk";
import { requireCommercial } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const commercial = await requireCommercial();

  return exporterDocumentsCommandes({
    request,
    utilisateur: commercial,
    portee: "commercial",
  });
}
