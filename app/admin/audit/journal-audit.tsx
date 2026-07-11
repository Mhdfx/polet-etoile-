import type { RoleUtilisateur } from "@prisma/client";
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
import { construireFiltreAudit } from "@/lib/audit-filters";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

const TAILLE_PAGE = 20;

export type ParametresAudit = {
  page?: string;
  utilisateur?: string;
  action?: string;
  entite?: string;
  debut?: string;
  fin?: string;
};

type JournalAuditProps = {
  searchParams: Promise<ParametresAudit>;
  chemin: "/admin/audit" | "/admin/historique-admins";
  titre: string;
  description: string;
  roleAuteur?: RoleUtilisateur;
};

function apercuJson(valeur: unknown): string {
  if (!valeur) {
    return "-";
  }
  const texte = JSON.stringify(valeur);
  return texte.length > 140 ? `${texte.slice(0, 140)}...` : texte;
}

function construireQuery(params: ParametresAudit, page?: number) {
  const query = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur && cle !== "page") {
      query.set(cle, valeur);
    }
  }
  if (page && page > 1) {
    query.set("page", String(page));
  }
  return query;
}

export async function JournalAudit({
  searchParams,
  chemin,
  titre,
  description,
  roleAuteur,
}: JournalAuditProps) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;
  let erreurPeriode: string | undefined;
  if (params.debut && params.fin) {
    try {
      bornes = bornesJourneeInclusive(params.debut, params.fin);
    } catch (erreur) {
      erreurPeriode =
        erreur instanceof Error
          ? erreur.message
          : "La date de fin doit être égale ou postérieure à la date de début.";
    }
  }

  const where = construireFiltreAudit({
    utilisateurId: params.utilisateur,
    action: params.action,
    entite: params.entite,
    bornes,
    roleAuteur,
    periodeInvalide: Boolean(erreurPeriode),
  });

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
      where: {
        deleted_at: null,
        ...(roleAuteur ? { role: roleAuteur } : {}),
      },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
  ]);

  const pagesTotal = Math.max(1, Math.ceil(totalLignes / TAILLE_PAGE));
  const queryExport = construireQuery(params);
  if (roleAuteur) {
    queryExport.set("roleAuteur", roleAuteur);
  }

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif={chemin}
      titre={titre}
      description={description}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form className="flex flex-wrap items-end gap-2">
            <select
              name="utilisateur"
              defaultValue={params.utilisateur ?? ""}
              aria-label="Filtrer par utilisateur"
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">
                {roleAuteur ? "Tous les administrateurs" : "Tous les utilisateurs"}
              </option>
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
              aria-label="Filtrer par action"
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <input
              name="entite"
              defaultValue={params.entite ?? ""}
              placeholder="Entité..."
              aria-label="Filtrer par entité"
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <input
              name="debut"
              type="date"
              defaultValue={params.debut ?? ""}
              aria-label="Date de début"
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <input
              name="fin"
              type="date"
              defaultValue={params.fin ?? ""}
              aria-label="Date de fin"
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
            <Button type="submit">Filtrer</Button>
          </form>
          <Button variant="outline" asChild>
            <Link href={`/admin/audit/export?${queryExport.toString()}`}>
              Export Excel
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
                <TableHead>{roleAuteur ? "Administrateur" : "Utilisateur"}</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Avant</TableHead>
                <TableHead>Après</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucun événement trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateHeure(audit.created_at)}
                    </TableCell>
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

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            {totalLignes} événement{totalLignes > 1 ? "s" : ""} - page {page} sur {pagesTotal}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={`${chemin}?${construireQuery(params, page - 1).toString()}`}>
                  Précédent
                </Link>
              ) : (
                <span>Précédent</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagesTotal}
              asChild={page < pagesTotal}
            >
              {page < pagesTotal ? (
                <Link href={`${chemin}?${construireQuery(params, page + 1).toString()}`}>
                  Suivant
                </Link>
              ) : (
                <span>Suivant</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
