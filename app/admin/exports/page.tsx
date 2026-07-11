import Link from "next/link";
import { DatabaseBackup, Download, FileSpreadsheet } from "lucide-react";
import { AppShell, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/session";

export default async function ExportsAdminPage() {
  const admin = await requireAdmin();

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/exports"
      titre="Exports"
      description="Exports Excel pour analyse externe et comptabilite."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Exports disponibles" eyebrow="Donnees">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-semibold">Export global</p>
                <p className="text-xs text-muted-foreground">
                  Produits, clients, clients externes et commandes.
                </p>
              </div>
              <Button asChild>
                <Link href="/admin/exports/global">
                  <Download />
                  Telecharger
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-semibold">Journal d&apos;audit</p>
                <p className="text-xs text-muted-foreground">
                  Export filtrable depuis la page d&apos;audit.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/admin/audit">
                  <FileSpreadsheet />
                  Ouvrir audit
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-semibold">Commandes</p>
                <p className="text-xs text-muted-foreground">
                  Export selon les filtres actifs de la liste commandes.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/admin/commandes">
                  <FileSpreadsheet />
                  Ouvrir commandes
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-semibold">Bons de charge</p>
                <p className="text-xs text-muted-foreground">
                  Quantites chargees par tournee (une ligne par produit).
                </p>
              </div>
              <Button asChild>
                <Link href="/admin/charges/export">
                  <Download />
                  Telecharger
                </Link>
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Sauvegarde" eyebrow="Responsabilite">
          <div className="grid gap-3 text-sm text-muted-foreground">
            <DatabaseBackup className="h-8 w-8 text-primary" />
            <p>
              Ces exports servent aux analyses ponctuelles. Ils ne remplacent pas
              la sauvegarde automatique de la base MySQL, qui reste geree par
              l&apos;infrastructure serveur.
            </p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
