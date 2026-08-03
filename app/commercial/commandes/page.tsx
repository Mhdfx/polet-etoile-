import Link from "next/link";
import Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";
import { Download, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BadgeStatut } from "@/components/badge-statut";
import { CarteKPI } from "@/components/carte-kpi";
import { CaseSelectionToutesCommandes } from "@/components/case-selection-toutes-commandes";
import { Button } from "@/components/ui/button";
import { BoutonTelechargementCommercial } from "@/app/commandes/bouton-telechargement-commercial";
import { calculerTotauxCommande } from "@/lib/commandes-vue";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatDateHeure, formatMontant } from "@/lib/format";
import { requireCommercial } from "@/lib/session";

const TAILLES_PAGE = [10, 25, 50, 100] as const;

type ParametresRecherche = Promise<{
  page?: string;
  q?: string;
  statut?: string;
  debut?: string;
  fin?: string;
  taille?: string;
  erreurDocuments?: string;
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
  const tailleDemandee = Number.parseInt(params.taille ?? "25", 10);
  const taillePage = TAILLES_PAGE.includes(tailleDemandee as (typeof TAILLES_PAGE)[number])
    ? tailleDemandee
    : 25;
  const recherche = (params.q ?? "").trim();
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
    utilisateur_id: commercial.id,
    deleted_at: null,
    // Periode invalide : aucun resultat plutot qu'une liste non filtree trompeuse.
    ...(erreurPeriode ? { id: { in: [] } } : {}),
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
    select: {
      id: true,
      numero_bl: true,
      date_commande: true,
      client: { select: { nom: true, region_ville: true } },
      lignes: { where: { deleted_at: null }, select: { prix_net: true } },
      paiements: { select: { montant: true, date_paiement: true } },
      telechargements_documents: {
        where: { type_document: "BL" },
        select: { created_at: true },
        take: 1,
      },
      bon_charge: {
        where: { deleted_at: null },
        select: {
          id: true,
          numero_bc: true,
          telechargements_documents: {
            where: { type_document: "BON_CHARGE" },
            select: { created_at: true },
            take: 1,
          },
        },
      },
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
      utilisateur={commercial}
      espace="commercial"
      cheminActif="/commercial/commandes"
      titre="Mes commandes"
      description="Commandes du portefeuille commercial avec paiements calcules."
    >
      <div className="grid min-w-0 gap-4">
        {params.erreurDocuments ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {params.erreurDocuments}
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-4">
          <CarteKPI label="Commandes filtrees" valeur={String(totauxListe.total)} tonalite="neutre" />
          <CarteKPI label="Réglées" valeur={String(totauxListe.payees)} tonalite="vert" />
          <CarteKPI label="CA filtre" valeur={formatMontant(totauxListe.ca)} tonalite="bleu" />
          <CarteKPI label="Reste filtre" valeur={formatMontant(totauxListe.reste)} tonalite="rouge" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="flex flex-wrap items-end gap-2" aria-label="Filtres des commandes">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Recherche
              <input name="q" defaultValue={recherche} placeholder="BL ou client..." className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Du
              <input name="debut" type="date" defaultValue={params.debut ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Au
              <input name="fin" type="date" defaultValue={params.fin ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Statut
              <select name="statut" defaultValue={statut ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground">
                <option value="">Tous les statuts</option>
                <option value="en_attente">Non réglée</option>
                <option value="paye">Réglée</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Affichage
              <select name="taille" defaultValue={String(taillePage)} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground">
                {TAILLES_PAGE.map((taille) => <option key={taille} value={taille}>{taille} / page</option>)}
              </select>
            </label>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
            {(recherche || statut || params.debut || params.fin || params.taille) ? (
              <Button type="button" variant="ghost" asChild><Link href="/commercial/commandes">Reinitialiser</Link></Button>
            ) : null}
          </form>
          {erreurPeriode ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {erreurPeriode}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/commercial/commandes/export?${new URLSearchParams(params).toString()}`}>
                <Download />
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

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <form action="/commercial/commandes/documents" method="post">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-foreground">Documents des commandes cochees</span>
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    name="documents"
                    value="bl"
                    defaultChecked
                    className="h-4 w-4 accent-primary"
                  />
                  BL
                </label>
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    name="documents"
                    value="bon_charge"
                    defaultChecked
                    className="h-4 w-4 accent-primary"
                  />
                  Bons de charge
                </label>
                <span className="text-xs text-muted-foreground">
                  BL et bon de charge : un seul telechargement commercial, date tracee.
                </span>
              </div>
              <Button type="submit" variant="outline" size="sm">
                <Download />
                PDF selection
              </Button>
            </div>

            <div className="grid gap-3 p-3 xl:grid-cols-2">
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 text-sm font-medium">
                <CaseSelectionToutesCommandes />
                Tout selectionner sur cette page
              </label>
              {commandes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Aucune commande.
                </p>
              ) : commandes.map((commande) => {
                const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);
                const dateReglement = totaux.statutPaiement === "paye"
                  ? commande.paiements.map((paiement) => paiement.date_paiement).sort((a, b) => b.getTime() - a.getTime())[0]
                  : undefined;
                const blTelechargeAt = commande.telechargements_documents[0]?.created_at;
                const bonChargeTelechargeAt = commande.bon_charge?.telechargements_documents[0]?.created_at;
                const aucunDocumentDisponible = Boolean(blTelechargeAt) &&
                  (!commande.bon_charge || Boolean(bonChargeTelechargeAt));
                return (
                  <article key={commande.id} className="grid gap-3 rounded-lg border border-border p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex min-h-11 items-center gap-3 font-semibold">
                        <input
                          type="checkbox"
                          name="commandeIds"
                          value={commande.id}
                          data-selection-commande="true"
                          disabled={aucunDocumentDisponible}
                          aria-label={`Selectionner ${commande.numero_bl}`}
                          className="size-4 accent-primary"
                        />
                        <Link href={`/commercial/commandes/${commande.id}`} className="text-primary hover:underline">
                          {commande.numero_bl}
                        </Link>
                      </label>
                      <BadgeStatut statut={totaux.statutPaiement} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><dt className="text-muted-foreground">Date</dt><dd>{formatDate(commande.date_commande)}</dd></div>
                      <div><dt className="text-muted-foreground">Reglement</dt><dd>{dateReglement ? formatDate(dateReglement) : "-"}</dd></div>
                      <div className="col-span-2"><dt className="text-muted-foreground">Client / region</dt><dd className="font-medium">{commande.client?.nom ?? "-"} · {commande.client?.region_ville ?? "-"}</dd></div>
                      <div><dt className="text-muted-foreground">Total</dt><dd className="tabular-nums">{formatMontant(totaux.total)}</dd></div>
                      <div><dt className="text-muted-foreground">Reste</dt><dd className="tabular-nums">{formatMontant(totaux.resteDu)}</dd></div>
                    </dl>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                      <div className="grid gap-1 text-muted-foreground">
                        <span>BC : {commande.bon_charge?.numero_bc ?? "Aucun"}</span>
                        {bonChargeTelechargeAt ? <span>Telecharge le {formatDateHeure(bonChargeTelechargeAt)}</span> : null}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <BoutonTelechargementCommercial
                          commandeId={commande.id}
                          typeDocument="bl"
                          libelle="Telecharger BL"
                          indisponible={Boolean(blTelechargeAt)}
                          motifIndisponible={blTelechargeAt ? `BL telecharge le ${formatDateHeure(blTelechargeAt)}` : undefined}
                        />
                        <BoutonTelechargementCommercial
                          commandeId={commande.id}
                          typeDocument="bon_charge"
                          libelle="Telecharger BC"
                          indisponible={!commande.bon_charge || Boolean(bonChargeTelechargeAt)}
                          motifIndisponible={!commande.bon_charge ? "Aucun bon de charge disponible" : bonChargeTelechargeAt ? `BC telecharge le ${formatDateHeure(bonChargeTelechargeAt)}` : undefined}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </form>
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
