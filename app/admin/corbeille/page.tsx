import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
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
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

type LigneCorbeille = {
  cle: string;
  type: string;
  libelle: string;
  details: string;
  supprimeLe?: Date | null;
  supprimePar?: string;
  auditAction?: string;
  href?: string;
};

export default async function CorbeillePage() {
  const admin = await requireAdmin();

  const [
    commandes,
    clients,
    clientsExternes,
    produits,
    utilisateurs,
    bonsCharge,
    audits,
  ] = await Promise.all([
    prisma.commande.findMany({
      where: { deleted_at: { not: null } },
      orderBy: { deleted_at: "desc" },
      take: 100,
      select: {
        id: true,
        numero_bl: true,
        type_commande: true,
        deleted_at: true,
        client: { select: { nom: true } },
        client_externe: { select: { nom: true } },
        utilisateur: { select: { nom_complet: true } },
      },
    }),
    prisma.client.findMany({
      where: { deleted_at: { not: null } },
      orderBy: { deleted_at: "desc" },
      take: 100,
      select: {
        id: true,
        nom: true,
        region_ville: true,
        deleted_at: true,
        commercial: { select: { nom_complet: true } },
      },
    }),
    prisma.clientExterne.findMany({
      where: { deleted_at: { not: null } },
      orderBy: { deleted_at: "desc" },
      take: 100,
      select: { id: true, nom: true, region_ville: true, deleted_at: true },
    }),
    prisma.produit.findMany({
      where: { deleted_at: { not: null } },
      orderBy: { deleted_at: "desc" },
      take: 100,
      select: { id: true, nom: true, categorie: true, deleted_at: true },
    }),
    prisma.user.findMany({
      where: { deleted_at: { not: null } },
      orderBy: { deleted_at: "desc" },
      take: 100,
      select: {
        id: true,
        nom_complet: true,
        nom_utilisateur: true,
        role: true,
        deleted_at: true,
      },
    }),
    prisma.bonCharge.findMany({
      where: { deleted_at: { not: null } },
      orderBy: { deleted_at: "desc" },
      take: 100,
      select: {
        id: true,
        numero_bc: true,
        deleted_at: true,
        commercial: { select: { nom_complet: true } },
        commande: { select: { numero_bl: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: "suppression" } },
          { action: { contains: "fusion" } },
        ],
      },
      orderBy: { created_at: "desc" },
      take: 500,
      select: {
        action: true,
        entite: true,
        entite_id: true,
        created_at: true,
        utilisateur: { select: { nom_complet: true, nom_utilisateur: true } },
      },
    }),
  ]);

  const auditParEntite = new Map(
    audits
      .filter((audit) => audit.entite_id)
      .map((audit) => [`${audit.entite}:${audit.entite_id}`, audit]),
  );
  const lignes: LigneCorbeille[] = [
    ...commandes.map((commande) => {
      const audit = auditParEntite.get(`commandes:${commande.id}`);
      const client = commande.client?.nom ?? commande.client_externe?.nom ?? "-";
      return {
        cle: `commande-${commande.id}`,
        type: "Commande",
        libelle: commande.numero_bl,
        details: `${client} - ${commande.utilisateur.nom_complet}`,
        supprimeLe: commande.deleted_at,
        supprimePar: auteurAudit(audit),
        auditAction: audit?.action,
      };
    }),
    ...clients.map((client) => {
      const audit = auditParEntite.get(`clients:${client.id}`);
      return {
        cle: `client-${client.id}`,
        type: "Client",
        libelle: client.nom,
        details: `${client.region_ville} - ${client.commercial.nom_complet}`,
        supprimeLe: client.deleted_at,
        supprimePar: auteurAudit(audit),
        auditAction: audit?.action,
      };
    }),
    ...clientsExternes.map((client) => {
      const audit = auditParEntite.get(`clients_externes:${client.id}`);
      return {
        cle: `client-externe-${client.id}`,
        type: "Client externe",
        libelle: client.nom,
        details: client.region_ville,
        supprimeLe: client.deleted_at,
        supprimePar: auteurAudit(audit),
        auditAction: audit?.action,
      };
    }),
    ...produits.map((produit) => {
      const audit = auditParEntite.get(`produits:${produit.id}`);
      return {
        cle: `produit-${produit.id}`,
        type: "Produit",
        libelle: produit.nom,
        details: produit.categorie,
        supprimeLe: produit.deleted_at,
        supprimePar: auteurAudit(audit),
        auditAction: audit?.action,
      };
    }),
    ...utilisateurs.map((utilisateur) => {
      const audit = auditParEntite.get(`users:${utilisateur.id}`);
      return {
        cle: `user-${utilisateur.id}`,
        type: "Utilisateur",
        libelle: utilisateur.nom_complet,
        details: `${utilisateur.nom_utilisateur} - ${utilisateur.role}`,
        supprimeLe: utilisateur.deleted_at,
        supprimePar: auteurAudit(audit),
        auditAction: audit?.action,
      };
    }),
    ...bonsCharge.map((bon) => {
      const audit = auditParEntite.get(`bons_charge:${bon.id}`);
      return {
        cle: `bc-${bon.id}`,
        type: "Bon de charge",
        libelle: bon.numero_bc,
        details: `${bon.commercial.nom_complet}${
          bon.commande ? ` - ${bon.commande.numero_bl}` : ""
        }`,
        supprimeLe: bon.deleted_at,
        supprimePar: auteurAudit(audit),
        auditAction: audit?.action,
      };
    }),
  ].sort((a, b) => {
    const dateA = a.supprimeLe?.getTime() ?? 0;
    const dateB = b.supprimeLe?.getTime() ?? 0;
    return dateB - dateA;
  });

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/corbeille"
      titre="Corbeille"
      description="Vue admin des elements supprimes logiquement et des traces de suppression."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {lignes.length} element(s) supprime(s) visibles. Restauration
            automatique desactivee pour eviter de casser les liens commandes,
            paiements et bons.
          </p>
          <Button variant="outline" asChild>
            <Link href="/admin/audit">Voir audit complet</Link>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Element</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Supprime le</TableHead>
                <TableHead>Supprime par</TableHead>
                <TableHead>Trace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Aucun element supprime.
                  </TableCell>
                </TableRow>
              ) : (
                lignes.map((ligne) => (
                  <TableRow key={ligne.cle}>
                    <TableCell>
                      <Badge variant="secondary">{ligne.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{ligne.libelle}</TableCell>
                    <TableCell>{ligne.details}</TableCell>
                    <TableCell>
                      {ligne.supprimeLe ? formatDateHeure(ligne.supprimeLe) : "-"}
                    </TableCell>
                    <TableCell>{ligne.supprimePar ?? "-"}</TableCell>
                    <TableCell>{ligne.auditAction ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}

function auteurAudit(
  audit:
    | {
        utilisateur: { nom_complet: string; nom_utilisateur: string } | null;
      }
    | undefined,
): string | undefined {
  return audit?.utilisateur
    ? `${audit.utilisateur.nom_complet} (${audit.utilisateur.nom_utilisateur})`
    : undefined;
}
