import { exporterDocumentsCommandes } from "@/app/commandes/documents-bulk";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdmin();

  return exporterDocumentsCommandes({
    request,
    utilisateur: admin,
    portee: "admin",
  });
}
