import { AppShell } from "@/components/app-shell";
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
import { SupprimerSessionButton } from "./session-actions";

export default async function SessionsPage() {
  const admin = await requireAdmin();
  const maintenant = new Date();

  const sessions = await prisma.session.findMany({
    where: { expiresAt: { gt: maintenant } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      token: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      user: {
        select: {
          nom_complet: true,
          nom_utilisateur: true,
          role: true,
          actif: true,
        },
      },
    },
  });

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/sessions"
      titre="Sessions actives"
      description="Sessions Better Auth stockees en base, avec deconnexion forcee."
    >
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Derniere activite</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>User agent</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Aucune session active.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <p className="font-medium">{session.user.nom_complet}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user.nom_utilisateur}
                    </p>
                  </TableCell>
                  <TableCell>{session.user.role}</TableCell>
                  <TableCell>{session.ipAddress ?? "-"}</TableCell>
                  <TableCell>{formatDateHeure(session.updatedAt)}</TableCell>
                  <TableCell>{formatDateHeure(session.expiresAt)}</TableCell>
                  <TableCell className="max-w-80 truncate">
                    {session.userAgent ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <SupprimerSessionButton sessionId={session.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
