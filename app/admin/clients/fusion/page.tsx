import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { FusionClientsForm } from "./fusion-form";

function signature(nom: string) {
  return nom.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
}

export default async function FusionClientsPage() {
  const admin = await requireAdmin();
  const clients = await prisma.client.findMany({
    where: { deleted_at: null },
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      region_ville: true,
      commercial: { select: { nom_complet: true } },
      _count: { select: { commandes: true } },
    },
  });

  const doublons = clients.filter((client, index) =>
    clients.some((autre, autreIndex) => autreIndex !== index && signature(autre.nom) === signature(client.nom)),
  );

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/clients"
      titre="Fusion clients"
      description="Reattribuer toutes les commandes d'un doublon vers le client conserve, puis supprimer logiquement le doublon."
    >
      <div className="grid gap-5">
        <Button variant="outline" asChild className="w-fit">
          <Link href="/admin/clients">Retour clients</Link>
        </Button>
        <FusionClientsForm
          clients={clients.map((client) => ({
            id: client.id,
            nom: client.nom,
            commercial: client.commercial.nom_complet,
          }))}
        />
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Doublons potentiels</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Commercial</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doublons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    Aucun doublon evident detecte.
                  </TableCell>
                </TableRow>
              ) : (
                doublons.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.nom}</TableCell>
                    <TableCell>{client.region_ville}</TableCell>
                    <TableCell>{client.commercial.nom_complet}</TableCell>
                    <TableCell className="text-right tabular-nums">{client._count.commandes}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </AppShell>
  );
}

