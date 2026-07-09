import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Download } from "lucide-react";
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
  clients?: string;
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
  } else {
    query.delete("page");
  }
  const chaine = query.toString();
  return chaine
    ? `/commercial/commandes/externes?${chaine}`
    : "/commercial/commandes/externes";
}

export default async function CommandesExternesCommercialPage({
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
  const clientsSelectionnes = (params.clients ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;
  let erreurPeriode: string | undefined;
  if (params.debut && params.fin) {
    try {
      bornes = bornesJourneeInclusive(params.debut, params.fin);
    } catch {
      erreurPeriode = "La date fin doit etre posterieure a la date debut.";
    }
  }

  const where: Prisma.CommandeWhereInput = {
    utilisateur_id: commercial.id,
    deleted_at: null,
    type_commande: "EXTERNE",
    ...(clientsSelectionnes.length > 0
      ? { client_externe_id: { in: clientsSelectionnes } }
      : {}),
    ...(bornes ? { date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
    ...(recherche
      ? {
          OR: [
            { numero_bl: { contains: recherche } },
            { client_externe: { nom: { contains: recherche } } },
          ],
        }
      : {}),
  };

  const [commandesBrutes, clientsExternes] = await Promise.all([
    prisma.commande.findMany({
      where,
      orderBy: { date_commande: "desc" },
      take: 5000,
      select: {
        id: true,
        numero_bl: true,
        date_commande: true,
        client_externe: { select: { id: true, nom: true, region_ville: true } },
        lignes: { where: { deleted_at: null }, select: { prix_net: true } },
        paiements: { select: { montant: true } },
      },
    }),
    prisma.clientExterne.findMany({
      where: { actif: true, deleted_at: null },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
  ]);

  const commandesFiltrees = commandesBrutes.filter((commande) => {
    if (!statut) {
      return true;
    }
    return calculerTotauxCommande(commande.lignes, commande.paiements).statutPaiement === statut;
  });
  const totalLignes = commandesFiltrees.length;
  const commandes = commandesFiltrees.slice((page - 1) * TAILLE_PAGE, page * TAILLE_PAGE);
  const pagesTotal = Math.max(1, Math.ceil(totalLignes / TAILLE_PAGE));

  const exportParams = new URLSearchParams(params);
  exportParams.set("type", "EXTERNE");

  return (
    <AppShell
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/commandes/externes"
      titre="Commandes externes"
      description="Commandes externes rattachees au portefeuille commercial."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="flex flex-wrap items-end gap-2">
            <input
              name="q"
              defaultValue={recherche}
              placeholder="BL ou client externe..."
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <select
              name="clients"
              defaultValue={params.clients ?? ""}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">Tous clients externes</option>
              {clientsExternes.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom}
                </option>
              ))}
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
            <Button variant="ghost" asChild>
              <Link href="/commercial/commandes/externes">Reset</Link>
            </Button>
          </form>

          <Button variant="outline" asChild>
            <Link href={`/commercial/commandes/export?${exportParams.toString()}`}>
              <Download />
              Export Excel
            </Link>
          </Button>
        </div>

        {erreurPeriode ? <p className="text-sm text-destructive">{erreurPeriode}</p> : null}

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BL</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client externe</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Reste</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucune commande externe trouvee.
                  </TableCell>
                </TableRow>
              ) : (
                commandes.map((commande) => {
                  const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);
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
                      <TableCell>{commande.client_externe?.nom ?? "-"}</TableCell>
                      <TableCell>{commande.client_externe?.region_ville ?? "-"}</TableCell>
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

