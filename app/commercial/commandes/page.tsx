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
import { calculerTotauxCommande } from "@/lib/commandes-vue";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatMontant } from "@/lib/format";
import { requireCommercial } from "@/lib/session";

const TAILLE_PAGE = 15;

type ParametresRecherche = Promise<{
  page?: string;
  q?: string;
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
  return chaine ? `/commercial/commandes?${chaine}` : "/commercial/commandes";
}

export default async function CommandesCommercialPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const commercial = await requireCommercial();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const recherche = (params.q ?? "").trim();
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
    utilisateur_id: commercial.id,
    deleted_at: null,
    ...(bornes ? { date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
    ...(recherche
      ? {
          OR: [
            { numero_bl: { contains: recherche } },
            { client: { nom: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const commandesBrutes = await prisma.commande.findMany({
    where,
    orderBy: { date_commande: "desc" },
    take: 5000,
    select: {
      id: true,
      numero_bl: true,
      date_commande: true,
      client: { select: { nom: true } },
      lignes: { where: { deleted_at: null }, select: { prix_net: true } },
      paiements: { select: { montant: true } },
    },
  });

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
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/commandes"
      titre="Mes commandes"
      description="Commandes du portefeuille commercial avec paiements calcules."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="flex flex-wrap items-end gap-2">
            <input
              name="q"
              defaultValue={recherche}
              placeholder="BL ou client..."
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
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
            <select
              name="statut"
              defaultValue={statut ?? ""}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">Tous statuts</option>
              <option value="paye">Paye</option>
              <option value="en_attente">En attente</option>
            </select>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/commercial/commandes/export?${new URLSearchParams(params).toString()}`}>
                Export Excel
              </Link>
            </Button>
            <Button asChild>
              <Link href="/commercial/commandes/nouvelle">
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Reste</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                          href={`/commercial/commandes/${commande.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {commande.numero_bl}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(commande.date_commande)}</TableCell>
                      <TableCell>{commande.client?.nom ?? "-"}</TableCell>
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
