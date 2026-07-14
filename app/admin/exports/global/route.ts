import ExcelJS from "exceljs";
import { calculerTotauxCommande, libelleStatutPaiement, libelleTypeCommande } from "@/lib/commandes-vue";
import { prisma } from "@/lib/db";
import { formatDateHeure, formatMontant } from "@/lib/format";
import { entetesFichierPrive } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();

  const [produits, clients, clientsExternes, commandes] = await Promise.all([
    prisma.produit.findMany({
      where: { deleted_at: null },
      orderBy: [{ categorie: "asc" }, { ordre_affichage: "asc" }, { nom: "asc" }],
      select: { nom: true, categorie: true, prix_reference: true, actif: true },
    }),
    prisma.client.findMany({
      where: { deleted_at: null },
      orderBy: { nom: "asc" },
      select: {
        nom: true,
        region_ville: true,
        telephone: true,
        actif: true,
        commercial: { select: { nom_complet: true } },
      },
    }),
    prisma.clientExterne.findMany({
      where: { deleted_at: null },
      orderBy: { nom: "asc" },
      select: { nom: true, region_ville: true, telephone: true, actif: true },
    }),
    prisma.commande.findMany({
      where: { deleted_at: null },
      orderBy: { date_commande: "desc" },
      select: {
        numero_bl: true,
        date_commande: true,
        type_commande: true,
        client: { select: { nom: true } },
        client_externe: { select: { nom: true } },
        utilisateur: { select: { nom_complet: true } },
        lignes: { where: { deleted_at: null }, select: { prix_net: true } },
        paiements: { select: { montant: true } },
      },
    }),
  ]);

  const workbook = new ExcelJS.Workbook();

  const feuilleProduits = workbook.addWorksheet("Produits");
  feuilleProduits.columns = [
    { header: "Nom", key: "nom", width: 34 },
    { header: "Categorie", key: "categorie", width: 24 },
    { header: "Prix reference", key: "prix", width: 18 },
    { header: "Actif", key: "actif", width: 10 },
  ];
  produits.forEach((produit) =>
    feuilleProduits.addRow({
      nom: produit.nom,
      categorie: produit.categorie,
      prix: formatMontant(produit.prix_reference),
      actif: produit.actif ? "Oui" : "Non",
    }),
  );

  const feuilleClients = workbook.addWorksheet("Clients");
  feuilleClients.columns = [
    { header: "Nom", key: "nom", width: 32 },
    { header: "Ville", key: "ville", width: 24 },
    { header: "Telephone", key: "telephone", width: 18 },
    { header: "Commercial", key: "commercial", width: 28 },
    { header: "Actif", key: "actif", width: 10 },
  ];
  clients.forEach((client) =>
    feuilleClients.addRow({
      nom: client.nom,
      ville: client.region_ville,
      telephone: client.telephone ?? "",
      commercial: client.commercial.nom_complet,
      actif: client.actif ? "Oui" : "Non",
    }),
  );

  const feuilleExternes = workbook.addWorksheet("Clients externes");
  feuilleExternes.columns = [
    { header: "Nom", key: "nom", width: 32 },
    { header: "Ville", key: "ville", width: 24 },
    { header: "Telephone", key: "telephone", width: 18 },
    { header: "Actif", key: "actif", width: 10 },
  ];
  clientsExternes.forEach((client) =>
    feuilleExternes.addRow({
      nom: client.nom,
      ville: client.region_ville,
      telephone: client.telephone ?? "",
      actif: client.actif ? "Oui" : "Non",
    }),
  );

  const feuilleCommandes = workbook.addWorksheet("Commandes");
  feuilleCommandes.columns = [
    { header: "Numero BL", key: "numero", width: 18 },
    { header: "Date", key: "date", width: 20 },
    { header: "Client", key: "client", width: 32 },
    { header: "Commercial", key: "commercial", width: 28 },
    { header: "Type", key: "type", width: 12 },
    { header: "Total", key: "total", width: 18 },
    { header: "Paye", key: "paye", width: 18 },
    { header: "Reste", key: "reste", width: 18 },
    { header: "Statut", key: "statut", width: 14 },
  ];
  commandes.forEach((commande) => {
    const totaux = calculerTotauxCommande(commande.lignes, commande.paiements);
    feuilleCommandes.addRow({
      numero: commande.numero_bl,
      date: formatDateHeure(commande.date_commande),
      client: commande.client?.nom ?? commande.client_externe?.nom ?? "",
      commercial: commande.utilisateur.nom_complet,
      type: libelleTypeCommande(commande.type_commande),
      total: formatMontant(totaux.total),
      paye: formatMontant(totaux.totalPaye),
      reste: formatMontant(totaux.resteDu),
      statut: libelleStatutPaiement(totaux.statutPaiement),
    });
  });

  for (const feuille of workbook.worksheets) {
    feuille.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as BodyInit, {
    headers: entetesFichierPrive(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `attachment; filename="export_global_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    ),
  });
}
