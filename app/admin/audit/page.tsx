import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { Button } from "@/components/ui/button";

const TAILLE_PAGE = 20;

type ParametresRecherche = Promise<{
  page?: string;
  utilisateur?: string;
  action?: string;
  entite?: string;
  debut?: string;
  fin?: string;
}>;

function apercuJson(valeur: unknown): string {
  if (!valeur) {
    return "-";
  }
  const texte = JSON.stringify(valeur);
  return texte.length > 140 ? `${texte.slice(0, 140)}...` : texte;
}

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
  return chaine ? `/admin/audit?${chaine}` : "/admin/audit";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

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

  const where: Prisma.AuditLogWhereInput = {
    ...(params.utilisateur ? { utilisateur_id: params.utilisateur } : {}),
    ...(params.action ? { action: { contains: params.action } } : {}),
    ...(params.entite ? { entite: { contains: params.entite } } : {}),
    ...(bornes ? { created_at: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc } } : {}),
  };

  const [totalLignes, audits, utilisateurs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
      select: {
        id: true,
        action: true,
        entite: true,
        entite_id: true,
        donnees_avant: true,
        donnees_apres: true,
        ip_address: true,
        created_at: true,
        utilisateur: { select: { nom_complet: true, nom_utilisateur: true } },
      },
    }),
    prisma.user.findMany({
      where: { deleted_at: null },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
  ]);

  const pagesTotal = Math.max(1, Math.ceil(totalLignes / TAILLE_PAGE));

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/audit"
      titre="Audit"
      description="Journal des actions sensibles conservees en base."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2">
          <select
            name="utilisateur"
            defaultValue={params.utilisateur ?? ""}
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          >
            <option value="">Tous les utilisateurs</option>
            {utilisateurs.map((utilisateur) => (
              <option key={utilisateur.id} value={utilisateur.id}>
                {utilisateur.nom_complet}
              </option>
            ))}
          </select>
          <input
            name="action"
            defaultValue={params.action ?? ""}
            placeholder="Action..."
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          />
          <input
            name="entite"
            defaultValue={params.entite ?? ""}
            placeholder="Entite..."
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
          <button className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Filtrer
          </button>
        </form>
        <Button variant="outline" asChild>
          <Link href={`/admin/audit/export?${new URLSearchParams(params).toString()}`}>
            Export Excel audit
          </Link>
        </Button>
        {erreurPeriode ? (
          <p role="alert" className="w-full text-sm text-destructive">
            {erreurPeriode}
          </p>
        ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entite</TableHead>
                <TableHead>Avant</TableHead>
                <TableHead>Apres</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucun evenement d&apos;audit.
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell>{formatDateHeure(audit.created_at)}</TableCell>
                    <TableCell>
                      {audit.utilisateur
                        ? `${audit.utilisateur.nom_complet} (${audit.utilisateur.nom_utilisateur})`
                        : "-"}
                    </TableCell>
                    <TableCell>{audit.action}</TableCell>
                    <TableCell>
                      {audit.entite}
                      {audit.entite_id ? (
                        <span className="block text-xs text-muted-foreground">
                          {audit.entite_id}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-64 font-mono text-xs">
                      {apercuJson(audit.donnees_avant)}
                    </TableCell>
                    <TableCell className="max-w-64 font-mono text-xs">
                      {apercuJson(audit.donnees_apres)}
                    </TableCell>
                    <TableCell>{audit.ip_address ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {totalLignes} evenement{totalLignes > 1 ? "s" : ""} - page {page} sur{" "}
            {pagesTotal}
          </p>
          <div className="flex gap-2">
            <a
              className="rounded-lg border border-border px-3 py-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
              aria-disabled={page <= 1}
              href={page > 1 ? lienPage(params, page - 1) : undefined}
            >
              Precedent
            </a>
            <a
              className="rounded-lg border border-border px-3 py-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
              aria-disabled={page >= pagesTotal}
              href={page < pagesTotal ? lienPage(params, page + 1) : undefined}
            >
              Suivant
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
