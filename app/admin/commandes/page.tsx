import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BadgeStatut } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculerTotauxCommande, libelleTypeCommande } from "@/lib/commandes-vue";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

const TAILLE_PAGE = 15;

type ParametresRecherche = Promise<{
  page?: string;
  q?: string;
  commercial?: string;
  type?: string;
  statut?: string;
  debut?: string;
  fin?: string;
}>;

function lienPage(params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur) {
      query.set(cle, valeur);
    }
  }
  if (page > 1) {
    query.set("page", String(page));
  }
  const chaine = query.toString();
  return chaine ? `/admin/commandes?${chaine}` : "/admin/commandes";
}

export default async function CommandesAdminPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const recherche = (params.q ?? "").trim();
  const commercial = params.commercial || undefined;
  const type = params.type === "STANDARD" || params.type === "EXTERNE" ? params.type : undefined;
  const statut =
    params.statut === "paye" || params.statut === "en_attente"
      ? params.statut
      : undefined;

  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;
  if (params.debut && params.fin) {
    try {
      bornes = bornesJourneeInclusive(params.debut, params.fin);
    } catch {
      bornes = undefined;
    }
  }

  const where: Prisma.CommandeWhereInput = {
    deleted_at: null,
    ...(commercial ? { utilisateur_id: commercial } : {}),
    ...(type ? { type_commande: type } : {}),
    ...(bornes
      ? {
          date_commande: {
            gte: bornes.debutUtc,
            lt: bornes.finExclusiveUtc,
          },
        }
      : {}),
    ...(recherche
      ? {
          OR: [
            { numero_bl: { contains: recherche } },
            { client: { nom: { contains: recherche } } },
            { client_externe: { nom: { contains: recherche } } },
            { utilisateur: { nom_complet: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const [commandesBrutes, commerciaux] = await Promise.all([
    prisma.commande.findMany({
      where,
      orderBy: { date_commande: "desc" },
      take: 5000,
      select: {
        id: true,
        numero_bl: true,
        type_commande: true,
        date_commande: true,
        client: { select: { nom: true } },
        client_externe: { select: { nom: true } },
        utilisateur: { select: { nom_complet: true } },
        lignes: { where: { deleted_at: null }, select: { prix_net: true } },
        paiements: { select: { montant: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "COMMERCIAL", deleted_at: null },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
  ]);

  const commandesFiltrees = commandesBrutes.filter((commande) => {
    if (!statut) {
      return true;
    }
    return (
      calculerTotauxCommande(commande.lignes, commande.paiements).statutPaiement ===
      statut
    );
  });
  const totalLignes = commandesFiltrees.length;
  const commandes = commandesFiltrees.slice(
    (page - 1) * TAILLE_PAGE,
    page * TAILLE_PAGE,
  );
  const pagesTotal = Math.max(1, Math.ceil(totalLignes / TAILLE_PAGE));

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/commandes"
      titre="Commandes"
      description="Toutes les commandes, paiements calcules, filtres et exports."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="flex flex-wrap items-end gap-2">
            <input
              name="q"
              defaultValue={recherche}
              placeholder="BL, client, commercial..."
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <select
              name="commercial"
              defaultValue={commercial ?? ""}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">Tous les commerciaux</option>
              {commerciaux.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nom_complet}
                </option>
              ))}
            </select>
            <select
              name="type"
              defaultValue={type ?? ""}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">Tous types</option>
              <option value="STANDARD">Standard</option>
              <option value="EXTERNE">Externe</option>
            </select>
            <select
              name="statut"
              defaultValue={statut ?? ""}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">Tous statuts</option>
              <option value="paye">Paye</option>
              <option value="en_attente">En attente</option>
            </select>
            <input
              name="debut"
              type="date"
              defaultValue={params.debut ?? ""}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <input
              name="fin"
              type="date"
              defaultValue={params.fin ?? ""}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/commandes/export?${new URLSearchParams(params).toString()}`}>
                Export Excel
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/commandes/nouvelle">
                <Plus />
                Nouvelle commande
              </Link>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BL</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Commercial</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Reste</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Aucune commande.
                  </TableCell>
                </TableRow>
              ) : (
                commandes.map((commande) => {
                  const totaux = calculerTotauxCommande(
                    commande.lignes,
                    commande.paiements,
                  );
                  return (
                    <TableRow key={commande.id}>
                      <TableCell>
                        <Link
                          href={`/admin/commandes/${commande.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {commande.numero_bl}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(commande.date_commande)}</TableCell>
                      <TableCell>
                        {commande.client?.nom ?? commande.client_externe?.nom ?? "-"}
                      </TableCell>
                      <TableCell>{commande.utilisateur.nom_complet}</TableCell>
                      <TableCell>{libelleTypeCommande(commande.type_commande)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMontant(totaux.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMontant(totaux.resteDu)}
                      </TableCell>
                      <TableCell>
                        <BadgeStatut statut={totaux.statutPaiement} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {totalLignes} resultat{totalLignes > 1 ? "s" : ""} - page {page} sur{" "}
            {pagesTotal}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={lienPage(params, page - 1)}>Precedent</Link>
              ) : (
                "Precedent"
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagesTotal}
              asChild={page < pagesTotal}
            >
              {page < pagesTotal ? (
                <Link href={lienPage(params, page + 1)}>Suivant</Link>
              ) : (
                "Suivant"
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
