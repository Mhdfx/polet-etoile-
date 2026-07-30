import { exporterDocumentsCommandes } from "@/app/commandes/documents-bulk";
import { adapterErreurDocumentsPourNavigateur } from "@/app/commandes/documents-browser-response";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdmin();

  const response = await exporterDocumentsCommandes({
    request,
    utilisateur: admin,
    portee: "admin",
  });

  return adapterErreurDocumentsPourNavigateur({
    request,
    response,
    retour: "/admin/commandes",
  });
}
