import Link from "next/link";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { AppShell } from "@/components/app-shell";
import { Bouton } from "@/components/bouton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatMontant } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ObjectifRapideForm } from "./objectif-rapide-form";

type ParametresRecherche = Promise<{ mois?: string }>;

const FORMAT_MOIS = /^\d{4}-\d{2}$/;

function moisCourant(): string {
  return DateTime.now().setZone(FUSEAU_APPLICATION).toFormat("yyyy-MM");
}

function libelleMois(mois: string): string {
  const date = DateTime.fromFormat(mois, "yyyy-MM", { zone: FUSEAU_APPLICATION });
  return date.isValid ? date.setLocale("fr").toFormat("LLLL yyyy") : mois;
}

export default async function ObjectifsConsolidesPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const courant = moisCourant();
  const mois = params.mois && FORMAT_MOIS.test(params.mois) ? params.mois : courant;
  const moisClos = mois < courant;

  const debutMois = DateTime.fromFormat(mois, "yyyy-MM", { zone: FUSEAU_APPLICATION });
  const bornes = bornesJourneeInclusive(
    debutMois.startOf("month").toISODate()!,
    debutMois.endOf("month").toISODate()!,
  );

  const [commerciaux, objectifs, commandes] = await Promise.all([
    prisma.user.findMany({
      where: { role: "COMMERCIAL", deleted_at: null, actif: true },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
    prisma.objectif.findMany({
      where: { mois },
      select: { utilisateur_id: true, montant_objectif: true },
    }),
    prisma.commande.findMany({
      where: {
        deleted_at: null,
        date_commande: { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc },
      } satisfies Prisma.CommandeWhereInput,
      select: {
        utilisateur_id: true,
        lignes: { where: { deleted_at: null }, select: { prix_net: true } },
      },
    }),
  ]);

  const objectifParCommercial = new Map(
    objectifs.map((objectif) => [objectif.utilisateur_id, new Decimal(objectif.montant_objectif)]),
  );

  const realiseParCommercial = new Map<string, Decimal>();
  for (const commande of commandes) {
    const total = commande.lignes.reduce(
      (somme, ligne) => somme.plus(ligne.prix_net),
      new Decimal(0),
    );
    realiseParCommercial.set(
      commande.utilisateur_id,
      (realiseParCommercial.get(commande.utilisateur_id) ?? new Decimal(0)).plus(total),
    );
  }

  const lignes = commerciaux.map((commercial) => {
    const objectif = objectifParCommercial.get(commercial.id) ?? new Decimal(0);
    const realise = realiseParCommercial.get(commercial.id) ?? new Decimal(0);
    const taux = objectif.gt(0) ? realise.mul(100).div(objectif) : null;
    const ecart = realise.minus(objectif);
    return { commercial, objectif, realise, taux, ecart };
  });

  const totalObjectif = lignes.reduce((somme, ligne) => somme.plus(ligne.objectif), new Decimal(0));
  const totalRealise = lignes.reduce((somme, ligne) => somme.plus(ligne.realise), new Decimal(0));
  const totalEcart = totalRealise.minus(totalObjectif);

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/objectifs"
      titre="Objectifs commerciaux"
      description="Objectif mensuel par commercial, chiffre d'affaires realise, taux d'atteinte et ecart."
    >
      <div className="grid gap-5">
        <form className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
          <div className="grid gap-1.5">
            <Label htmlFor="objectifs-mois">Mois</Label>
            <Input id="objectifs-mois" name="mois" type="month" defaultValue={mois} className="w-44" />
          </div>
          <Bouton type="submit">Afficher</Bouton>
          <p className="text-sm text-muted-foreground">
            {libelleMois(mois)}
            {moisClos ? " — mois clos, objectifs en lecture seule." : " — objectif modifiable."}
          </p>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commercial</TableHead>
                <TableHead className="text-right">Objectif</TableHead>
                <TableHead className="text-right">Realise (CA)</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead className="text-right">Ecart</TableHead>
                <TableHead className="text-right">{moisClos ? "Historique" : "Definir l'objectif"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Aucun commercial actif.
                  </TableCell>
                </TableRow>
              ) : (
                lignes.map(({ commercial, objectif, realise, taux, ecart }) => (
                  <TableRow key={commercial.id}>
                    <TableCell className="font-medium text-foreground">{commercial.nom_complet}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMontant(objectif)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMontant(realise)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {taux ? `${taux.toFixed(1)} %` : "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${ecart.gte(0) ? "text-succes" : "text-alerte"}`}
                    >
                      {formatMontant(ecart)}
                    </TableCell>
                    <TableCell className="text-right">
                      {moisClos ? (
                        <Link
                          className="text-sm text-primary hover:underline"
                          href={`/admin/utilisateurs/${commercial.id}/objectifs`}
                        >
                          Voir l&apos;historique
                        </Link>
                      ) : (
                        <ObjectifRapideForm
                          utilisateurId={commercial.id}
                          mois={mois}
                          montantInitial={objectif.gt(0) ? objectif.toFixed(2) : ""}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {lignes.length > 0 ? (
                <TableRow className="font-semibold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMontant(totalObjectif)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMontant(totalRealise)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totalObjectif.gt(0) ? `${totalRealise.mul(100).div(totalObjectif).toFixed(1)} %` : "-"}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${totalEcart.gte(0) ? "text-succes" : "text-alerte"}`}
                  >
                    {formatMontant(totalEcart)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
