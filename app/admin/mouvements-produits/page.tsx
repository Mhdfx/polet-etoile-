import Link from "next/link";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Download, PackageCheck, RotateCcw } from "lucide-react";
import { DateTime } from "luxon";
import Decimal from "decimal.js";
import { AppShell } from "@/components/app-shell";
import { Bouton } from "@/components/bouton";
import { CarteKPI } from "@/components/carte-kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
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
import { formatQuantite } from "@/lib/format";
import {
  agregerMouvementsParJour,
  agregerMouvementsProduits,
  type MouvementProduitJournalier,
  type TypeMouvementProduit,
} from "@/lib/mouvements-produits";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import { GraphiqueMouvementsProduits } from "./mouvements-chart";

type ParametresRecherche = Promise<{
  debut?: string;
  fin?: string;
  commercial?: string;
  produit?: string;
  recherche?: string;
  filtre?: string;
  charge?: string;
  vente?: string;
  retour?: string;
  avec_vides?: string;
  detail?: string;
}>;

type EvenementAffiche = {
  cle: string;
  produitId: string;
  type: TypeMouvementProduit;
  date: Date;
  quantite: string;
  reference: string;
  href: string;
  commercial: string;
  tiers: string;
};

function aujourdHui() {
  return DateTime.now().setZone(FUSEAU_APPLICATION).toISODate()!;
}

function jourLocal(date: Date) {
  return DateTime.fromJSDate(date).setZone(FUSEAU_APPLICATION).toISODate()!;
}

function formatDateHeure(date: Date) {
  return DateTime.fromJSDate(date).setZone(FUSEAU_APPLICATION).toFormat("dd/MM/yyyy HH:mm");
}

function formatJour(jour: string | null) {
  return jour ? DateTime.fromISO(jour).toFormat("dd/MM/yyyy") : "—";
}

function libelleType(type: TypeMouvementProduit) {
  if (type === "CHARGE") return "Chargé";
  if (type === "VENTE") return "Vendu";
  return "Retourné";
}

function paramsConserves(params: Record<string, string | undefined>, changements: Record<string, string | undefined>) {
  const recherche = new URLSearchParams();
  for (const [cle, valeur] of Object.entries({ ...params, ...changements })) {
    if (valeur) recherche.set(cle, valeur);
  }
  return recherche.toString();
}

export default async function MouvementsProduitsPage({ searchParams }: { searchParams: ParametresRecherche }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const defaut = aujourdHui();
  const debut = params.debut ?? defaut;
  const fin = params.fin ?? defaut;
  const filtreSoumis = params.filtre === "1";
  const typesActifs = new Set<TypeMouvementProduit>(
    filtreSoumis
      ? [params.charge === "1" ? "CHARGE" : null, params.vente === "1" ? "VENTE" : null, params.retour === "1" ? "RETOUR" : null].filter((type): type is TypeMouvementProduit => Boolean(type))
      : ["CHARGE", "VENTE", "RETOUR"],
  );
  const avecVides = !filtreSoumis || params.avec_vides === "1";
  const commercialId = params.commercial || undefined;
  const produitId = params.produit || undefined;
  const rechercheNom = params.recherche?.trim() || undefined;

  let erreurPeriode: string | undefined;
  let bornes = bornesJourneeInclusive(defaut, defaut);
  try {
    bornes = bornesJourneeInclusive(debut, fin);
  } catch {
    erreurPeriode = "La période saisie est invalide.";
  }
  if (typesActifs.size === 0) erreurPeriode = "Sélectionnez au moins un type de mouvement.";

  const [tousProduits, commerciaux] = await Promise.all([
    prisma.produit.findMany({
      where: {
        deleted_at: null,
        suivi_stock: true,
      },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, actif: true },
    }),
    prisma.user.findMany({
      where: { role: "COMMERCIAL", deleted_at: null },
      orderBy: { nom_complet: "asc" },
      select: { id: true, nom_complet: true },
    }),
  ]);
  const produits = tousProduits.filter((produit) => {
    if (produitId && produit.id !== produitId) return false;
    if (rechercheNom && !produit.nom.toLocaleLowerCase("fr").includes(rechercheNom.toLocaleLowerCase("fr"))) return false;
    return true;
  });

  const periode = { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc };
  const idsProduits = produits.map((produit) => produit.id);
  const [lignesCharge, lignesVente, retours] = erreurPeriode || idsProduits.length === 0
    ? [[], [], []] as const
    : await Promise.all([
        typesActifs.has("CHARGE")
          ? prisma.ligneBonCharge.findMany({
              where: {
                deleted_at: null,
                produit_id: { in: idsProduits },
                bon_charge: {
                  deleted_at: null,
                  date_charge: periode,
                  ...(commercialId ? { commercial_id: commercialId } : {}),
                },
              },
              select: {
                id: true,
                produit_id: true,
                quantite_kg: true,
                bon_charge: {
                  select: {
                    id: true,
                    numero_bc: true,
                    date_charge: true,
                    commercial: { select: { nom_complet: true } },
                    commande: {
                      select: {
                        client: { select: { nom: true } },
                        client_externe: { select: { nom: true } },
                      },
                    },
                  },
                },
              },
            })
          : Promise.resolve([]),
        typesActifs.has("VENTE")
          ? prisma.ligneCommande.findMany({
              where: {
                deleted_at: null,
                produit_id: { in: idsProduits },
                commande: {
                  deleted_at: null,
                  type_commande: "STANDARD",
                  date_commande: periode,
                  ...(commercialId ? { utilisateur_id: commercialId } : {}),
                },
              },
              select: {
                id: true,
                produit_id: true,
                quantite: true,
                commande: {
                  select: {
                    id: true,
                    numero_bl: true,
                    date_commande: true,
                    utilisateur: { select: { nom_complet: true } },
                    client: { select: { nom: true } },
                    client_externe: { select: { nom: true } },
                  },
                },
              },
            })
          : Promise.resolve([]),
        typesActifs.has("RETOUR")
          ? prisma.retour.findMany({
              where: {
                produit_id: { in: idsProduits },
                created_at: periode,
                ...(commercialId ? { utilisateur_id: commercialId } : {}),
              },
              select: {
                id: true,
                produit_id: true,
                quantite_kg: true,
                created_at: true,
                utilisateur: { select: { nom_complet: true } },
              },
            })
          : Promise.resolve([]),
      ]);

  const evenements: EvenementAffiche[] = [
    ...lignesCharge.map((ligne) => ({
      cle: `charge:${ligne.id}`,
      produitId: ligne.produit_id,
      type: "CHARGE" as const,
      date: ligne.bon_charge.date_charge,
      quantite: ligne.quantite_kg.toString(),
      reference: ligne.bon_charge.numero_bc,
      href: `/admin/charges/${ligne.bon_charge.id}`,
      commercial: ligne.bon_charge.commercial.nom_complet,
      tiers: ligne.bon_charge.commande?.client?.nom ?? ligne.bon_charge.commande?.client_externe?.nom ?? "—",
    })),
    ...lignesVente.map((ligne) => ({
      cle: `vente:${ligne.id}`,
      produitId: ligne.produit_id,
      type: "VENTE" as const,
      date: ligne.commande.date_commande,
      quantite: ligne.quantite.toString(),
      reference: ligne.commande.numero_bl,
      href: `/admin/commandes/${ligne.commande.id}`,
      commercial: ligne.commande.utilisateur.nom_complet,
      tiers: ligne.commande.client?.nom ?? ligne.commande.client_externe?.nom ?? "—",
    })),
    ...retours.map((retour) => ({
      cle: `retour:${retour.id}`,
      produitId: retour.produit_id,
      type: "RETOUR" as const,
      date: retour.created_at,
      quantite: retour.quantite_kg.toString(),
      reference: "Retour",
      href: "/admin/retours",
      commercial: retour.utilisateur.nom_complet,
      tiers: "—",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const mouvements: MouvementProduitJournalier[] = evenements.map((evenement) => ({
    produitId: evenement.produitId,
    type: evenement.type,
    quantite: evenement.quantite,
    jour: jourLocal(evenement.date),
  }));
  const resumesComplets = agregerMouvementsProduits(produits, mouvements);
  const resumes = avecVides ? resumesComplets : resumesComplets.filter((resume) => resume.nombreMouvements > 0);
  const produitDetailId = params.detail && resumesComplets.some((resume) => resume.produitId === params.detail)
    ? params.detail
    : undefined;
  const mouvementsDetail = produitDetailId ? mouvements.filter((mouvement) => mouvement.produitId === produitDetailId) : mouvements;
  const evenementsDetail = produitDetailId ? evenements.filter((evenement) => evenement.produitId === produitDetailId) : evenements;
  const produitDetail = produitDetailId ? produits.find((produit) => produit.id === produitDetailId) : undefined;
  const serie = agregerMouvementsParJour(mouvementsDetail).map((point) => ({
    jour: DateTime.fromISO(point.jour).toFormat("dd/MM"),
    charge: point.charge.toNumber(),
    vendu: point.vendu.toNumber(),
    retourne: point.retourne.toNumber(),
  }));
  const totaux = resumesComplets.reduce(
    (total, ligne) => ({
      charge: total.charge.plus(ligne.charge),
      vendu: total.vendu.plus(ligne.vendu),
      retourne: total.retourne.plus(ligne.retourne),
      ecart: total.ecart.plus(ligne.ecart),
    }),
    { charge: new Decimal(0), vendu: new Decimal(0), retourne: new Decimal(0), ecart: new Decimal(0) },
  );

  const parametresCourants = {
    debut, fin,
    commercial: commercialId,
    produit: produitId,
    recherche: rechercheNom,
    filtre: filtreSoumis ? "1" : undefined,
    charge: typesActifs.has("CHARGE") ? "1" : undefined,
    vente: typesActifs.has("VENTE") ? "1" : undefined,
    retour: typesActifs.has("RETOUR") ? "1" : undefined,
    avec_vides: avecVides ? "1" : undefined,
  };

  return (
    <AppShell
      utilisateur={admin}
      espace="admin"
      cheminActif="/admin/mouvements-produits"
      titre="Mouvements produits"
      description="Vue quotidienne consolidée des quantités chargées, vendues et retournées pour chaque produit."
    >
      <div className="grid gap-5">
        <section className="rounded-lg bg-card p-4 shadow-sm ring-1 ring-border">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              ["Aujourd’hui", defaut, defaut],
              ["Hier", DateTime.fromISO(defaut).minus({ days: 1 }).toISODate()!, DateTime.fromISO(defaut).minus({ days: 1 }).toISODate()!],
              ["7 jours", DateTime.fromISO(defaut).minus({ days: 6 }).toISODate()!, defaut],
              ["Ce mois", DateTime.fromISO(defaut).startOf("month").toISODate()!, defaut],
            ].map(([label, du, au]) => (
              <Link key={label} href={`?${paramsConserves(parametresCourants, { debut: du, fin: au, detail: undefined })}`} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", debut === du && fin === au ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}>
                {label}
              </Link>
            ))}
          </div>
          <form className="grid gap-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
            <input type="hidden" name="filtre" value="1" />
            <div className="grid gap-1.5"><Label htmlFor="mvt-debut">Du</Label><Input id="mvt-debut" name="debut" type="date" defaultValue={debut} /></div>
            <div className="grid gap-1.5"><Label htmlFor="mvt-fin">Au</Label><Input id="mvt-fin" name="fin" type="date" defaultValue={fin} /></div>
            <div className="grid gap-1.5"><Label htmlFor="mvt-commercial">Commercial</Label><SelectNatif id="mvt-commercial" name="commercial" defaultValue={commercialId ?? ""}><option value="">Tous les commerciaux</option>{commerciaux.map((commercial) => <option key={commercial.id} value={commercial.id}>{commercial.nom_complet}</option>)}</SelectNatif></div>
            <div className="grid gap-1.5"><Label htmlFor="mvt-produit">Produit</Label><SelectNatif id="mvt-produit" name="produit" defaultValue={produitId ?? ""}><option value="">Tous les produits</option>{tousProduits.map((produit) => <option key={produit.id} value={produit.id}>{produit.nom}</option>)}</SelectNatif></div>
            <div className="grid gap-1.5"><Label htmlFor="mvt-recherche">Recherche</Label><Input id="mvt-recherche" name="recherche" placeholder="Nom du produit…" defaultValue={rechercheNom ?? ""} /></div>
            <Bouton type="submit">Filtrer</Bouton>
            <fieldset className="flex flex-wrap gap-x-5 gap-y-2 xl:col-span-6">
              <legend className="sr-only">Types de mouvements</legend>
              {[{ nom: "charge", label: "Chargé", actif: typesActifs.has("CHARGE") }, { nom: "vente", label: "Vendu", actif: typesActifs.has("VENTE") }, { nom: "retour", label: "Retourné", actif: typesActifs.has("RETOUR") }, { nom: "avec_vides", label: "Afficher les produits sans mouvement", actif: avecVides }].map((option) => <label key={option.nom} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" name={option.nom} value="1" defaultChecked={option.actif} className="h-4 w-4 accent-primary" />{option.label}</label>)}
            </fieldset>
          </form>
        </section>

        {erreurPeriode ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive ring-1 ring-destructive/30">{erreurPeriode}</p> : null}

        {!erreurPeriode ? <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <CarteKPI label="Total chargé" valeur={formatQuantite(totaux.charge)} tonalite="bleu" icon={ArrowDownToLine} />
            <CarteKPI label="Total vendu" valeur={formatQuantite(totaux.vendu)} tonalite="vert" icon={ArrowUpFromLine} />
            <CarteKPI label="Total retourné" valeur={formatQuantite(totaux.retourne)} tonalite="neutre" icon={RotateCcw} />
            <CarteKPI label="Écart" valeur={formatQuantite(totaux.ecart)} tonalite={totaux.ecart.isZero() ? "neutre" : "rouge"} icon={Activity} detail="Chargé − vendu − retourné" />
            <CarteKPI label="Produits actifs" valeur={`${resumesComplets.filter((ligne) => ligne.nombreMouvements > 0).length} / ${resumesComplets.length}`} tonalite="neutre" icon={PackageCheck} detail="Avec mouvement sur la période" />
          </div>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div><h2 className="font-semibold">Tous les produits</h2><p className="text-xs text-muted-foreground">Tri alphabétique · cliquez sur un produit pour afficher son détail sur cette page.</p></div>
              <div className="flex flex-wrap items-center gap-3">
                {produitDetailId ? <Link className="text-sm font-medium text-primary hover:underline" href={`?${paramsConserves(parametresCourants, { detail: undefined })}`}>Voir la vue globale</Link> : null}
                <Button asChild variant="outline" size="sm"><Link href={`/admin/mouvements-produits/export?${paramsConserves(parametresCourants, {})}`}><Download />Exporter Excel</Link></Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Chargé</TableHead><TableHead className="text-right">Vendu</TableHead><TableHead className="text-right">Retourné</TableHead><TableHead className="text-right">Écart</TableHead><TableHead className="text-right">Mouvements</TableHead><TableHead>Dernier mouvement</TableHead></TableRow></TableHeader>
                <TableBody>
                  {resumes.length === 0 ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun produit ne correspond aux filtres.</TableCell></TableRow> : resumes.map((ligne) => (
                    <TableRow key={ligne.produitId} className={cn(produitDetailId === ligne.produitId && "bg-primary/5")}>
                      <TableCell><Link href={`?${paramsConserves(parametresCourants, { detail: ligne.produitId })}`} className="font-semibold text-primary hover:underline">{ligne.nom}</Link>{!ligne.actif ? <Badge variant="outline" className="ml-2">Inactif</Badge> : null}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatQuantite(ligne.charge)}</TableCell><TableCell className="text-right tabular-nums">{formatQuantite(ligne.vendu)}</TableCell><TableCell className="text-right tabular-nums">{formatQuantite(ligne.retourne)}</TableCell>
                      <TableCell className={cn("text-right font-semibold tabular-nums", ligne.ecart.isZero() ? "text-muted-foreground" : "text-destructive")}>{formatQuantite(ligne.ecart)}</TableCell>
                      <TableCell className="text-right tabular-nums">{ligne.nombreMouvements}</TableCell><TableCell>{formatJour(ligne.dernierJour)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-card p-4"><div className="mb-4"><h2 className="font-semibold">Évolution quotidienne{produitDetail ? ` · ${produitDetail.nom}` : " · tous les produits"}</h2><p className="text-xs text-muted-foreground">Quantités en kilogrammes pour la période filtrée.</p></div><GraphiqueMouvementsProduits donnees={serie} /></div>
            <div className="overflow-hidden rounded-lg border border-border bg-card"><div className="border-b border-border p-4"><h2 className="font-semibold">Historique détaillé{produitDetail ? ` · ${produitDetail.nom}` : ""}</h2><p className="text-xs text-muted-foreground">Mouvements les plus récents en premier.</p></div><div className="max-h-[360px] overflow-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Référence</TableHead><TableHead>Commercial / client</TableHead><TableHead className="text-right">Quantité</TableHead></TableRow></TableHeader><TableBody>{evenementsDetail.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucun mouvement pour cette sélection.</TableCell></TableRow> : evenementsDetail.map((evenement) => <TableRow key={evenement.cle}><TableCell className="whitespace-nowrap text-xs">{formatDateHeure(evenement.date)}</TableCell><TableCell><Badge variant="outline">{libelleType(evenement.type)}</Badge></TableCell><TableCell><Link className="font-medium text-primary hover:underline" href={evenement.href}>{evenement.reference}</Link></TableCell><TableCell><span className="block text-sm">{evenement.commercial}</span><span className="block text-xs text-muted-foreground">{evenement.tiers}</span></TableCell><TableCell className="text-right tabular-nums">{formatQuantite(evenement.quantite)}</TableCell></TableRow>)}</TableBody></Table></div></div>
          </section>
          <p className="text-xs text-muted-foreground">Formule : écart = chargé − vendu − retourné. Les commandes externes et les produits non suivis en stock sont exclus. Les dates sont inclusives en heure de Casablanca.</p>
        </> : null}
      </div>
    </AppShell>
  );
}
