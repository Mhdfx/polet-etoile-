import { exporterDocumentsCommandes } from "@/app/commandes/documents-bulk";
import { adapterErreurDocumentsPourNavigateur } from "@/app/commandes/documents-browser-response";
import { requireCommercial } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const commercial = await requireCommercial();

  const response = await exporterDocumentsCommandes({
    request,
    utilisateur: commercial,
    portee: "commercial",
  });

  return adapterErreurDocumentsPourNavigateur({
    request,
    response,
    retour: "/commercial/commandes",
  });
}
