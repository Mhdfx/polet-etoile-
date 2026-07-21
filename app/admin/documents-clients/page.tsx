import { Archive, Download } from "lucide-react";
import { AppShell, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function DocumentsClientsPage() {
  const admin = await requireAdmin();

  const [clients, clientsExternes] = await Promise.all([
    prisma.client.findMany({
      where: { deleted_at: null },
      orderBy: [{ nom: "asc" }],
      select: {
        id: true,
        nom: true,
        region_ville: true,
        adresse: true,
        actif: true,
        commercial: { select: { nom_complet: true } },
        _count: { select: { commandes: true } },
      },
    }),
    prisma.clientExterne.findMany({
      where: { deleted_at: null },
      orderBy: [{ nom: "asc" }],
      select: {
        id: true,
        nom: true,
        region_ville: true,
        adresse: true,
        actif: true,
        _count: { select: { commandes: true } },
      },
    }),
  ]);

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/documents-clients"
      titre="Documents clients"
      description="Generation en masse des BL, factures et bons de charge par client."
    >
      <form
        action="/admin/documents-clients/export"
        method="post"
        className="grid gap-4 lg:grid-cols-[340px_1fr]"
      >
        <div className="grid gap-4">
          <Panel title="Documents a generer" eyebrow="Fichiers">
            <div className="grid gap-3 text-sm">
              <OptionCase
                name="documents"
                value="bl"
                label="Bons de livraison"
                description="Un PDF BL par commande du client."
                defaultChecked
              />
              <OptionCase
                name="documents"
                value="facture"
                label="Factures"
                description="Une facture PDF par commande du client."
                defaultChecked
              />
              <OptionCase
                name="documents"
                value="bon_charge"
                label="Bons de charge"
                description="Inclus seulement si la commande possede un bon de charge."
              />
            </div>
          </Panel>

          <Panel title="Periode" eyebrow="Filtre">
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="debut">Date debut</Label>
                <Input id="debut" name="debut" type="date" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fin">Date fin</Label>
                <Input id="fin" name="fin" type="date" />
              </div>
              <p className="text-xs text-muted-foreground">
                Laisser vide pour inclure tout l&apos;historique disponible.
              </p>
            </div>
          </Panel>

          <Panel title="Telechargement" eyebrow="Archive">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <Archive className="h-8 w-8 text-primary" />
              <p>
                Les fichiers sont regroupes dans une archive ZIP, avec un dossier
                par client et des noms de documents lisibles.
              </p>
              <Button type="submit" className="w-full">
                <Download />
                Generer le ZIP
              </Button>
            </div>
          </Panel>
        </div>

        <Panel title="Clients" eyebrow="Selection">
          <div className="grid gap-5">
            <GroupeClients
              titre="Clients standards"
              vide="Aucun client standard disponible."
              clients={clients.map((client) => ({
                id: `standard:${client.id}`,
                nom: client.nom,
                ville: client.region_ville,
                adresse: client.adresse,
                sousTitre: client.commercial.nom_complet,
                actif: client.actif,
                commandes: client._count.commandes,
              }))}
            />
            <GroupeClients
              titre="Clients externes"
              vide="Aucun client externe disponible."
              clients={clientsExternes.map((client) => ({
                id: `externe:${client.id}`,
                nom: client.nom,
                ville: client.region_ville,
                adresse: client.adresse,
                sousTitre: "Client externe",
                actif: client.actif,
                commandes: client._count.commandes,
              }))}
            />
          </div>
        </Panel>
      </form>
    </AppShell>
  );
}

function OptionCase({
  name,
  value,
  label,
  description,
  defaultChecked = false,
}: {
  name: string;
  value: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex gap-3 rounded-lg border border-border bg-background/50 p-3">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <span>
        <span className="block font-semibold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function GroupeClients({
  titre,
  vide,
  clients,
}: {
  titre: string;
  vide: string;
  clients: Array<{
    id: string;
    nom: string;
    ville: string;
    adresse: string | null;
    sousTitre: string;
    actif: boolean;
    commandes: number;
  }>;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-sm font-semibold">{titre}</h2>
        <p className="text-xs text-muted-foreground">
          Cocher les clients dont les documents doivent etre exportes.
        </p>
      </div>

      {clients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {vide}
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <label
              key={client.id}
              className="flex min-h-28 gap-3 rounded-lg border border-border bg-background/50 p-3 transition-colors hover:border-primary/50 hover:bg-background"
            >
              <input
                type="checkbox"
                name="clients"
                value={client.id}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="min-w-0 text-sm">
                <span className="block truncate font-semibold text-foreground">
                  {client.nom}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {client.sousTitre}
                </span>
                <span className="mt-2 block truncate text-xs text-muted-foreground">
                  {client.ville}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {client.adresse || "Adresse non renseignee"}
                </span>
                <span className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {client.commandes} commande{client.commandes > 1 ? "s" : ""}
                  </span>
                  {!client.actif ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      Inactif
                    </span>
                  ) : null}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
