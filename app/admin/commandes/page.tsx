import Link from "next/link";
import Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";
import { Download, FileText, Plus } from "lucide-react";
import { BonChargeCommandeButton } from "@/app/charges/bon-charge-commande-button";
import { AppShell } from "@/components/app-shell";
import { BadgeStatut } from "@/components/badge-statut";
import { CarteKPI } from "@/components/carte-kpi";
import { CaseSelectionToutesCommandes } from "@/components/case-selection-toutes-commandes";
import { Button } from "@/components/ui/button";
import { calculerTotauxCommande, libelleTypeCommande } from "@/lib/commandes-vue";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { trierAlphabetiquement } from "@/lib/tri-alphabetique";

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
        numero_facture: true,
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
  const commerciauxTries = trierAlphabetiquement(
    commerciaux,
    (utilisateur) => utilisateur.nom_complet,
  );

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
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Recherche
              <input name="q" defaultValue={recherche} placeholder="BL, client, responsable..." className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Responsable
            <select name="commercial" defaultValue={commercial ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground">
              <option value="">Tous les responsables</option>
              {commerciauxTries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nom_complet}
                </option>
              ))}
            </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Type
            <select name="type" defaultValue={type ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground">
              <option value="">Tous les types</option>
              <option value="EXTERNE">Externe</option>
              <option value="STANDARD">Standard</option>
            </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Statut
            <select name="statut" defaultValue={statut ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground">
              <option value="">Tous les statuts</option>
              <option value="en_attente">Non réglée</option>
              <option value="paye">Réglée</option>
            </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Du
              <input name="debut" type="date" defaultValue={params.debut ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Au
              <input name="fin" type="date" defaultValue={params.fin ?? ""} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Affichage
            <select name="taille" defaultValue={String(taillePage)} className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground">
              {TAILLES_PAGE.map((taille) => (
                <option key={taille} value={taille}>
                  {taille} / page
                </option>
              ))}
            </select>
            </label>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
            {(recherche || commercial || type || statut || params.debut || params.fin || params.taille) ? (
              <Button type="button" variant="ghost" asChild><Link href="/admin/commandes">Reinitialiser</Link></Button>
            ) : null}
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
          <form action="/admin/commandes/documents" method="post">
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
                    value="facture"
                    defaultChecked
                    className="h-4 w-4 accent-primary"
                  />
                  Factures
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
                const client = commande.client ?? commande.client_externe;
                return (
                  <article key={commande.id} className="grid gap-3 rounded-lg border border-border p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex min-h-11 items-center gap-3 font-semibold">
                        <input
                          type="checkbox"
                          name="commandeIds"
                          value={commande.id}
                          data-selection-commande="true"
                          aria-label={`Selectionner ${commande.numero_bl}`}
                          className="size-4 accent-primary"
                        />
                        <Link href={`/admin/commandes/${commande.id}`} className="text-primary hover:underline">
                          {commande.numero_bl}
                        </Link>
                      </label>
                      <BadgeStatut statut={totaux.statutPaiement} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><dt className="text-muted-foreground">Date</dt><dd>{formatDate(commande.date_commande)}</dd></div>
                      <div><dt className="text-muted-foreground">Type</dt><dd>{libelleTypeCommande(commande.type_commande)}</dd></div>
                      <div className="col-span-2"><dt className="text-muted-foreground">Client / region</dt><dd className="font-medium">{client?.nom ?? "-"} · {client?.region_ville ?? "-"}</dd></div>
                      <div className="col-span-2"><dt className="text-muted-foreground">Responsable</dt><dd>{commande.utilisateur.nom_complet}</dd></div>
                      <div><dt className="text-muted-foreground">Total</dt><dd className="tabular-nums">{formatMontant(totaux.total)}</dd></div>
                      <div><dt className="text-muted-foreground">Reste</dt><dd className="tabular-nums">{formatMontant(totaux.resteDu)}</dd></div>
                    </dl>
                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/commandes/${commande.id}/pdf`} target="_blank"><FileText /> BL</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/commandes/${commande.id}/facture`} target="_blank"><FileText /> {commande.numero_facture}</Link>
                      </Button>
                      <BonChargeCommandeButton
                        commandeId={commande.id}
                        bonCharge={commande.bon_charge ? {
                          id: commande.bon_charge.id,
                          numeroBc: commande.bon_charge.numero_bc,
                          supprime: Boolean(commande.bon_charge.deleted_at),
                        } : null}
                      />
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
