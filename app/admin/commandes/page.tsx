import Link from "next/link";
import Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";
import { Download, FileText, Plus } from "lucide-react";
import { BonChargeCommandeButton } from "@/app/charges/bon-charge-commande-button";
import { AppShell } from "@/components/app-shell";
import { BadgeStatut } from "@/components/badge-statut";
import { CarteKPI } from "@/components/carte-kpi";
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

const TAILLES_PAGE = [10, 25, 50, 100] as const;

type ParametresRecherche = Promise<{
  page?: string;
  q?: string;
  commercial?: string;
  type?: string;
  statut?: string;
  debut?: string;
  fin?: string;
  taille?: string;
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
  const tailleDemandee = Number.parseInt(params.taille ?? "25", 10);
  const taillePage = TAILLES_PAGE.includes(tailleDemandee as (typeof TAILLES_PAGE)[number])
    ? tailleDemandee
    : 25;
  const recherche = (params.q ?? "").trim();
  const commercial = params.commercial || undefined;
  const type = params.type === "STANDARD" || params.type === "EXTERNE" ? params.type : undefined;
  const statut =
    params.statut === "paye" || params.statut === "en_attente"
      ? params.statut
      : undefined;

  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;
  let erreurPeriode: string | undefined;
  if (params.debut && params.fin) {
    try {
      bornes = bornesJourneeInclusive(params.debut, params.fin);
    } catch (erreur) {
      bornes = undefined;
      erreurPeriode =
        erreur instanceof Error
          ? erreur.message
          : "La date de fin doit etre egale ou posterieure a la date de debut.";
    }
  }

  const where: Prisma.CommandeWhereInput = {
    deleted_at: null,
    // Periode invalide : aucun resultat plutot qu'une liste non filtree trompeuse.
    ...(erreurPeriode ? { id: { in: [] } } : {}),
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
      select: {
        id: true,
        numero_bl: true,
        type_commande: true,
        date_commande: true,
        client: { select: { nom: true, region_ville: true } },
        client_externe: { select: { nom: true, region_ville: true } },
        utilisateur: { select: { nom_complet: true } },
        lignes: { where: { deleted_at: null }, select: { prix_net: true } },
        paiements: { select: { montant: true } },
        bon_charge: { select: { id: true, numero_bc: true, deleted_at: true } },
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
    (page - 1) * taillePage,
    page * taillePage,
  );
  const pagesTotal = Math.max(1, Math.ceil(totalLignes / taillePage));
  const totauxListe = commandesFiltrees.reduce(
    (acc, commande) => {
      const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);
      acc.total += 1;
      acc.ca = acc.ca.plus(totaux.total);
      acc.reste = acc.reste.plus(totaux.resteDu);
      if (totaux.statutPaiement === "paye") acc.payees += 1;
      return acc;
    },
    { total: 0, payees: 0, ca: new Decimal(0), reste: new Decimal(0) },
  );

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/commandes"
      titre="Commandes"
      description="Toutes les commandes, creation admin, bons de charge, paiements calcules, filtres et exports."
    >
      <div className="grid min-w-0 gap-4">
        <div className="grid gap-4 md:grid-cols-4">
          <CarteKPI label="Commandes filtrees" valeur={String(totauxListe.total)} tonalite="neutre" />
          <CarteKPI label="Réglées" valeur={String(totauxListe.payees)} tonalite="vert" />
          <CarteKPI label="CA filtre" valeur={formatMontant(totauxListe.ca)} tonalite="bleu" />
          <CarteKPI label="Reste filtre" valeur={formatMontant(totauxListe.reste)} tonalite="rouge" />
        </div>
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
              <option value="paye">Réglée</option>
              <option value="en_attente">Non réglée</option>
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
              name="taille"
              defaultValue={String(taillePage)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {TAILLES_PAGE.map((taille) => (
                <option key={taille} value={taille}>
                  {taille} / page
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>
          {erreurPeriode ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {erreurPeriode}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/commandes/export?${new URLSearchParams(params).toString()}`}>
                <Download />
                Export Excel
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/commandes/nouvelle">
                <Plus />
                Ajouter une commande
              </Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table className="w-full table-fixed text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[96px]">BL</TableHead>
                <TableHead className="w-[92px]">Date</TableHead>
                <TableHead className="w-[180px]">Client</TableHead>
                <TableHead className="w-[96px]">Region</TableHead>
                <TableHead className="w-[116px]">Commercial</TableHead>
                <TableHead className="w-[78px]">Type</TableHead>
                <TableHead className="w-[88px] text-right">Total</TableHead>
                <TableHead className="w-[88px] text-right">Reste</TableHead>
                <TableHead className="w-[92px]">Statut</TableHead>
                <TableHead className="w-[52px] text-center">BL</TableHead>
                <TableHead className="w-[74px] text-center">Facture</TableHead>
                <TableHead className="w-[104px] text-center">Bon charge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    Aucune commande.
                  </TableCell>
                </TableRow>
              ) : (
                commandes.map((commande) => {
                  const totaux = calculerTotauxCommande(
                    commande.lignes,
                    commande.paiements,
                  );
                  const client = commande.client ?? commande.client_externe;
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
                        <span className="block max-w-[18ch] truncate" title={client?.nom ?? "-"}>
                          {client?.nom ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="truncate">{client?.region_ville ?? "-"}</TableCell>
                      <TableCell className="truncate">{commande.utilisateur.nom_complet}</TableCell>
                      <TableCell className="truncate">{libelleTypeCommande(commande.type_commande)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMontant(totaux.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMontant(totaux.resteDu)}
                      </TableCell>
                      <TableCell>
                        <BadgeStatut statut={totaux.statutPaiement} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link
                            href={`/admin/commandes/${commande.id}/pdf`}
                            target="_blank"
                            title={`PDF BL ${commande.numero_bl}`}
                            aria-label={`Ouvrir le PDF BL ${commande.numero_bl}`}
                          >
                            <FileText />
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link
                            href={`/admin/commandes/${commande.id}/facture`}
                            target="_blank"
                            title={`PDF facture ${commande.numero_bl}`}
                            aria-label={`Ouvrir la facture ${commande.numero_bl}`}
                          >
                            <FileText />
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <BonChargeCommandeButton
                          commandeId={commande.id}
                          bonCharge={
                            commande.bon_charge
                              ? {
                                  id: commande.bon_charge.id,
                                  numeroBc: commande.bon_charge.numero_bc,
                                  supprime: Boolean(commande.bon_charge.deleted_at),
                                }
                              : null
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            {totalLignes} resultat{totalLignes > 1 ? "s" : ""} - page {page} sur{" "}
            {pagesTotal}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={lienPage(params, 1)}>Premiere</Link>
              ) : (
                "Premiere"
              )}
            </Button>
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
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagesTotal}
              asChild={page < pagesTotal}
            >
              {page < pagesTotal ? (
                <Link href={lienPage(params, pagesTotal)}>Derniere</Link>
              ) : (
                "Derniere"
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
