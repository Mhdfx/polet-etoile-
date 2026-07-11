import { AppShell } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CLE_COMPTEUR_BL } from "@/lib/bl";
import { prisma } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ParametresForm } from "./parametres-form";

const valeursDefaut = {
  raisonSociale: "COQ PLUS SARL",
  ice: "003931636000009",
  rc: "39869 MOHAMMEDIA",
  identifiantFiscal: "72064177",
  patente: "39504226",
  adresse: "RDC 1 LOT EL FARAH MOHAMMEDIA",
  telephone: "",
  logoUrl: "",
  tauxTva: "0",
  prefixeBl: "CP",
  fuseauHoraire: "Africa/Casablanca",
};

const mapCles = {
  raison_sociale: "raisonSociale",
  ice: "ice",
  rc: "rc",
  identifiant_fiscal: "identifiantFiscal",
  patente: "patente",
  adresse: "adresse",
  telephone: "telephone",
  logo_url: "logoUrl",
  taux_tva: "tauxTva",
  prefixe_bl: "prefixeBl",
  fuseau_horaire: "fuseauHoraire",
} as const;

export default async function ParametresPage() {
  const admin = await requireAdmin();
  const [parametres, compteurBl, historique] = await Promise.all([
    prisma.parametreSysteme.findMany({
      where: { cle: { in: Object.keys(mapCles) } },
      select: { cle: true, valeur: true },
    }),
    prisma.compteurBl.findUnique({ where: { cle: CLE_COMPTEUR_BL }, select: { valeur: true } }),
    prisma.auditLog.findMany({
      where: { entite: "parametres_systeme" },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        created_at: true,
        utilisateur: { select: { nom_complet: true } },
      },
    }),
  ]);

  const valeurs = { ...valeursDefaut };
  for (const parametre of parametres) {
    const champ = mapCles[parametre.cle as keyof typeof mapCles];
    if (champ) {
      valeurs[champ] = parametre.valeur;
    }
  }

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/parametres"
      titre="Parametrage"
      description="Identite societe, fiscalite, numerotation BL et fuseau horaire."
    >
      <div className="grid gap-5">
        <div className="rounded-lg bg-card p-4 text-sm shadow-sm ring-1 ring-border">
          <p className="font-medium">Compteur BL courant</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {compteurBl?.valeur ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">
            Lecture seule. La numerotation reste verrouillee par transaction MySQL.
          </p>
        </div>

        <ParametresForm valeurs={valeurs} />

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Historique des modifications</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historique.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    Aucune modification de parametrage.
                  </TableCell>
                </TableRow>
              ) : (
                historique.map((ligne) => (
                  <TableRow key={ligne.id}>
                    <TableCell>{formatDateHeure(ligne.created_at)}</TableCell>
                    <TableCell>{ligne.utilisateur?.nom_complet ?? "-"}</TableCell>
                    <TableCell>{ligne.action}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </AppShell>
  );
}
