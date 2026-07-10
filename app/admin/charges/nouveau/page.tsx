import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ChargeForm } from "../charge-form";

export default async function NouveauBonChargePage() {
  const admin = await requireAdmin();

  const [commerciaux, produits] = await Promise.all([
    prisma.user.findMany({
      where: { role: "COMMERCIAL", actif: true, deleted_at: null },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
    // Seuls les produits physiques suivis en stock peuvent être chargés.
    prisma.produit.findMany({
      where: { actif: true, deleted_at: null, suivi_stock: true },
      orderBy: { ordre_affichage: "asc" },
      select: { id: true, nom: true },
    }),
  ]);

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/charges"
      titre="Nouveau bon de charge"
      description="Saisir les quantités chargées sur la tournée d'un commercial."
    >
      <div className="grid gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/admin/charges">
            <ArrowLeft className="h-4 w-4" /> Retour aux bons de charge
          </Link>
        </Button>

        {commerciaux.length === 0 || produits.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            {commerciaux.length === 0
              ? "Aucun commercial actif. Créez d'abord un commercial."
              : "Aucun produit suivi en stock. Activez le suivi de stock sur des produits."}
          </p>
        ) : (
          <ChargeForm
            commerciaux={commerciaux.map((c) => ({ id: c.id, nom: c.nom_complet }))}
            produits={produits.map((p) => ({ id: p.id, nom: p.nom }))}
          />
        )}
      </div>
    </AppShell>
  );
}
