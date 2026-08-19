import Decimal from "decimal.js";
import ExcelJS from "exceljs";
import { DateTime } from "luxon";
import { bornesJourneeInclusive, FUSEAU_APPLICATION } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { entetesFichierPrive } from "@/lib/http";
import {
  agregerMouvementsProduits,
  type MouvementProduitJournalier,
  type TypeMouvementProduit,
} from "@/lib/mouvements-produits";
import { requireAdmin } from "@/lib/session";

function jourLocal(date: Date) {
  return DateTime.fromJSDate(date).setZone(FUSEAU_APPLICATION).toISODate()!;
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const aujourdHui = DateTime.now().setZone(FUSEAU_APPLICATION).toISODate()!;
  const debut = url.searchParams.get("debut") ?? aujourdHui;
  const fin = url.searchParams.get("fin") ?? aujourdHui;
  const filtreSoumis = url.searchParams.get("filtre") === "1";
  const commercialId = url.searchParams.get("commercial") || undefined;
  const produitId = url.searchParams.get("produit") || undefined;
  const recherche = (url.searchParams.get("recherche") ?? "").trim();
  const avecVides = !filtreSoumis || url.searchParams.get("avec_vides") === "1";
  const types = new Set<TypeMouvementProduit>(
    filtreSoumis
      ? [
          url.searchParams.get("charge") === "1" ? "CHARGE" : null,
          url.searchParams.get("vente") === "1" ? "VENTE" : null,
          url.searchParams.get("retour") === "1" ? "RETOUR" : null,
        ].filter((type): type is TypeMouvementProduit => Boolean(type))
      : ["CHARGE", "VENTE", "RETOUR"],
  );

  if (types.size === 0) return new Response("Selectionnez au moins un type de mouvement.", { status: 400 });
  let bornes;
  try {
    bornes = bornesJourneeInclusive(debut, fin);
  } catch {
    return new Response("Periode invalide.", { status: 400 });
  }

  const tousProduits = await prisma.produit.findMany({
    where: { deleted_at: null, suivi_stock: true },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, actif: true },
  });
  const produits = tousProduits.filter((produit) =>
    (!produitId || produit.id === produitId) &&
    (!recherche || produit.nom.toLocaleLowerCase("fr").includes(recherche.toLocaleLowerCase("fr"))),
  );
  const idsProduits = produits.map((produit) => produit.id);
  const periode = { gte: bornes.debutUtc, lt: bornes.finExclusiveUtc };
  const [charges, ventes, retours] = idsProduits.length === 0
    ? [[], [], []] as const
    : await Promise.all([
        types.has("CHARGE")
          ? prisma.ligneBonCharge.findMany({
              where: { deleted_at: null, produit_id: { in: idsProduits }, bon_charge: { deleted_at: null, date_charge: periode, ...(commercialId ? { commercial_id: commercialId } : {}) } },
              select: { produit_id: true, quantite_kg: true, bon_charge: { select: { date_charge: true } } },
            })
          : Promise.resolve([]),
        types.has("VENTE")
          ? prisma.ligneCommande.findMany({
              where: { deleted_at: null, produit_id: { in: idsProduits }, commande: { deleted_at: null, type_commande: "STANDARD", date_commande: periode, ...(commercialId ? { utilisateur_id: commercialId } : {}) } },
              select: { produit_id: true, quantite: true, commande: { select: { date_commande: true } } },
            })
          : Promise.resolve([]),
        types.has("RETOUR")
          ? prisma.retour.findMany({
              where: { produit_id: { in: idsProduits }, created_at: periode, ...(commercialId ? { utilisateur_id: commercialId } : {}) },
              select: { produit_id: true, quantite_kg: true, created_at: true },
            })
          : Promise.resolve([]),
      ]);

  const mouvements: MouvementProduitJournalier[] = [
    ...charges.map((ligne) => ({ produitId: ligne.produit_id, type: "CHARGE" as const, quantite: ligne.quantite_kg, jour: jourLocal(ligne.bon_charge.date_charge) })),
    ...ventes.map((ligne) => ({ produitId: ligne.produit_id, type: "VENTE" as const, quantite: ligne.quantite, jour: jourLocal(ligne.commande.date_commande) })),
    ...retours.map((ligne) => ({ produitId: ligne.produit_id, type: "RETOUR" as const, quantite: ligne.quantite_kg, jour: jourLocal(ligne.created_at) })),
  ];
  const resumes = agregerMouvementsProduits(produits, mouvements).filter(
    (ligne) => avecVides || ligne.nombreMouvements > 0,
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Coq Plus";
  const feuille = workbook.addWorksheet("Mouvements produits");
  feuille.columns = [
    { header: "Produit", key: "produit", width: 32 },
    { header: "Statut", key: "statut", width: 12 },
    { header: "Charge (kg)", key: "charge", width: 16 },
    { header: "Vendu (kg)", key: "vendu", width: 16 },
    { header: "Retourne (kg)", key: "retourne", width: 16 },
    { header: "Ecart (kg)", key: "ecart", width: 16 },
    { header: "Nb mouvements", key: "nombre", width: 16 },
    { header: "Dernier mouvement", key: "dernier", width: 20 },
  ];
  for (const ligne of resumes) {
    const row = feuille.addRow({
      produit: ligne.nom,
      statut: ligne.actif ? "Actif" : "Inactif",
      charge: Number(ligne.charge.toFixed(3)),
      vendu: Number(ligne.vendu.toFixed(3)),
      retourne: Number(ligne.retourne.toFixed(3)),
      ecart: Number(ligne.ecart.toFixed(3)),
      nombre: ligne.nombreMouvements,
      dernier: ligne.dernierJour ? DateTime.fromISO(ligne.dernierJour).toFormat("dd/MM/yyyy") : "",
    });
    for (const cle of ["charge", "vendu", "retourne", "ecart"]) row.getCell(cle).numFmt = "0.000";
  }
  const totaux = resumes.reduce(
    (total, ligne) => ({ charge: total.charge.plus(ligne.charge), vendu: total.vendu.plus(ligne.vendu), retourne: total.retourne.plus(ligne.retourne), ecart: total.ecart.plus(ligne.ecart) }),
    { charge: new Decimal(0), vendu: new Decimal(0), retourne: new Decimal(0), ecart: new Decimal(0) },
  );
  const totalRow = feuille.addRow({ produit: "TOTAL", charge: Number(totaux.charge.toFixed(3)), vendu: Number(totaux.vendu.toFixed(3)), retourne: Number(totaux.retourne.toFixed(3)), ecart: Number(totaux.ecart.toFixed(3)) });
  totalRow.font = { bold: true };
  for (const cle of ["charge", "vendu", "retourne", "ecart"]) totalRow.getCell(cle).numFmt = "0.000";
  feuille.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  feuille.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4E89" } };
  feuille.views = [{ state: "frozen", ySplit: 1 }];
  feuille.autoFilter = { from: "A1", to: "H1" };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as BodyInit, {
    headers: entetesFichierPrive(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `attachment; filename="mouvements_produits_${debut}_${fin}.xlsx"`,
    ),
  });
}
