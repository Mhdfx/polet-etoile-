import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
import {
  calculerReconciliation,
  type MouvementProduit,
  type ProduitReference,
} from "@/lib/charge";
import { bornesJourneeInclusive } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatMontant, formatQuantite } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

type ParametresRecherche = Promise<{ commercial?: string; debut?: string; fin?: string }>;

function CarteStat({
  libelle,
  valeur,
  ton = "neutre",
}: {
  libelle: string;
  valeur: string;
  ton?: "neutre" | "alerte" | "succes";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        ton === "alerte"
          ? "border-destructive/30 bg-destructive/5"
          : ton === "succes"
            ? "border-succes/30 bg-succes/5"
            : "border-border bg-card",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {libelle}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          ton === "alerte" ? "text-destructive" : ton === "succes" ? "text-succes" : "text-foreground",
        )}
      >
        {valeur}
      </p>
    </div>
  );
}

export default async function RapprochementPage({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const commerciaux = await prisma.user.findMany({
    where: { role: "COMMERCIAL", deleted_at: null },
    orderBy: { nom_complet: "asc" },
    select: { id: true, nom_complet: true, actif: true },
  });

  const commercialId = params.commercial ?? "";
  let erreurPeriode: string | undefined;
  let bornes: { debutUtc: Date; finExclusiveUtc: Date } | undefined;

  if (params.debut && params.fin) {
    try {
      bornes = bornesJourneeInclusive(params.debut, params.fin);
    } catch {
      erreurPeriode = "La date fin doit etre egale ou posterieure a la date debut.";
    }
  }

  const pretPourCalcul = Boolean(commercialId && bornes && !erreurPeriode);

  let reconciliation: ReturnType<typeof calculerReconciliation> | undefined;

  if (pretPourCalcul && bornes) {
    const periodeCharge = { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc };

    const [lignesCharge, lignesVente, retours] = await Promise.all([
      prisma.ligneBonCharge.findMany({
        where: {
          deleted_at: null,
          bon_charge: {
            deleted_at: null,
            commercial_id: commercialId,
            date_charge: periodeCharge,
          },
          produit: { suivi_stock: true },
        },
        select: { produit_id: true, quantite_kg: true },
      }),
      // Vendu = commandes STANDARD du commercial (sa tournée). Les commandes
      // externes ne sont pas rattachées à une tournée -> exclues.
      prisma.ligneCommande.findMany({
        where: {
          deleted_at: null,
          produit: { suivi_stock: true },
          commande: {
            deleted_at: null,
            utilisateur_id: commercialId,
            type_commande: "STANDARD",
            date_commande: periodeCharge,
          },
        },
        select: { produit_id: true, quantite: true },
      }),
      prisma.retour.findMany({
        where: {
          utilisateur_id: commercialId,
          created_at: periodeCharge,
          produit: { suivi_stock: true },
        },
        select: { produit_id: true, quantite_kg: true },
      }),
    ]);

    const charges: MouvementProduit[] = lignesCharge.map((l) => ({
      produitId: l.produit_id,
      quantite: l.quantite_kg,
    }));
    const ventes: MouvementProduit[] = lignesVente.map((l) => ({
      produitId: l.produit_id,
      quantite: l.quantite,
    }));
    const retoursMouv: MouvementProduit[] = retours.map((l) => ({
      produitId: l.produit_id,
      quantite: l.quantite_kg,
    }));

    const idsConcernes = Array.from(
      new Set([...charges, ...ventes, ...retoursMouv].map((m) => m.produitId)),
    );

    const produits: ProduitReference[] =
      idsConcernes.length > 0
        ? (
            await prisma.produit.findMany({
              where: { id: { in: idsConcernes }, suivi_stock: true },
              select: { id: true, nom: true, prix_reference: true },
            })
          ).map((p) => ({ id: p.id, nom: p.nom, prix_reference: p.prix_reference }))
        : [];

    reconciliation = calculerReconciliation(produits, charges, ventes, retoursMouv);
  }

  const manquant = reconciliation?.totalEcartValorise;

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/rapprochement"
      titre="Rapprochement de tournée"
      description="Chargé − Vendu − Retourné par produit. Un écart positif = manquant (perte, casse, don ou vente non saisie) ; négatif = survente (chargement non saisi)."
    >
      <div className="grid gap-4">
        <form className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
          <div className="grid gap-1.5">
            <Label htmlFor="rappro-commercial">Commercial</Label>
            <select
              id="rappro-commercial"
              name="commercial"
              defaultValue={commercialId}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Choisir —</option>
              {commerciaux.map((commercial) => (
                <option key={commercial.id} value={commercial.id}>
                  {commercial.nom_complet}
                  {commercial.actif ? "" : " (inactif)"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rappro-debut">Date debut</Label>
            <Input id="rappro-debut" name="debut" type="date" defaultValue={params.debut ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rappro-fin">Date fin</Label>
            <Input id="rappro-fin" name="fin" type="date" defaultValue={params.fin ?? ""} />
          </div>
          <Button type="submit">Calculer</Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/rapprochement">Reset</Link>
          </Button>
          {erreurPeriode ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {erreurPeriode}
            </p>
          ) : null}
        </form>

        {!pretPourCalcul ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Sélectionnez un commercial et une période pour calculer le rapprochement.
          </p>
        ) : reconciliation && reconciliation.lignes.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Aucun mouvement (charge, vente ou retour) sur cette période pour ce commercial.
          </p>
        ) : reconciliation ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CarteStat libelle="Total chargé" valeur={formatQuantite(reconciliation.totalCharge)} />
              <CarteStat libelle="Total vendu" valeur={formatQuantite(reconciliation.totalVendu)} />
              <CarteStat
                libelle="Total retourné"
                valeur={formatQuantite(reconciliation.totalRetourne)}
              />
              <CarteStat
                libelle="Écart valorisé"
                valeur={formatMontant(manquant ?? 0)}
                ton={manquant && !manquant.isZero() ? "alerte" : "succes"}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Chargé</TableHead>
                    <TableHead className="text-right">Vendu</TableHead>
                    <TableHead className="text-right">Retourné</TableHead>
                    <TableHead className="text-right">Écart</TableHead>
                    <TableHead className="text-right">Écart valorisé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliation.lignes.map((ligne) => {
                    const ecartNonNul = !ligne.ecart.isZero();
                    return (
                      <TableRow key={ligne.produitId}>
                        <TableCell>{ligne.nom}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantite(ligne.charge)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantite(ligne.vendu)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantite(ligne.retourne)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            ecartNonNul ? "font-semibold text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {formatQuantite(ligne.ecart)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            ecartNonNul ? "font-semibold text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {formatMontant(ligne.ecartValorise)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantite(reconciliation.totalCharge)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantite(reconciliation.totalVendu)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantite(reconciliation.totalRetourne)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantite(reconciliation.totalEcart)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMontant(reconciliation.totalEcartValorise)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Ventes = commandes standard du commercial sur la période. Les commandes externes
              et les produits non suivis en stock (ex. RELIQUAT PAYEMENT) sont exclus.
            </p>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
