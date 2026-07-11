import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { CommandeDocumentData } from "./document-data";

const BORDURE = "#7b7b7b";
const GRIS = "#777777";
const ROUGE = "#b93a34";
const VERT = "#1f6b36";

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 18,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#111111",
  },
  logoWrap: {
    alignItems: "center",
    height: 74,
    marginBottom: 2,
  },
  logo: {
    width: 74,
    height: 74,
    objectFit: "contain",
  },
  logoFallback: {
    width: 74,
    height: 58,
    border: `2 solid ${VERT}`,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff9df",
  },
  logoFallbackText: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: 700,
    color: VERT,
    textAlign: "center",
  },
  topRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 7,
  },
  leftHeader: {
    flex: 1,
  },
  clientBox: {
    width: 164,
    minHeight: 104,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 9,
  },
  blBox: {
    height: 40,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  blLabel: {
    width: 118,
    paddingLeft: 32,
    fontWeight: 700,
  },
  blValue: {
    flex: 1,
    textAlign: "center",
    fontWeight: 700,
  },
  metaGrid: {
    flexDirection: "row",
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 4,
    overflow: "hidden",
  },
  metaCell: {
    flex: 1,
    minHeight: 52,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
  },
  metaHead: {
    height: 23,
    borderBottom: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  metaValue: {
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  clientName: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 12,
  },
  clientLine: {
    marginBottom: 14,
  },
  clientFiscal: {
    fontSize: 7.5,
    marginTop: "auto",
  },
  siteLine: {
    flexDirection: "row",
    marginLeft: 6,
    marginBottom: 7,
  },
  siteLabel: {
    fontWeight: 700,
    marginRight: 14,
  },
  siteValue: {
    fontWeight: 700,
  },
  table: {
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
  },
  row: {
    flexDirection: "row",
    minHeight: 18,
  },
  tableHead: {
    minHeight: 31,
  },
  tableCell: {
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingHorizontal: 7,
    justifyContent: "center",
  },
  headText: {
    textAlign: "center",
    fontWeight: 700,
  },
  designation: { width: 232 },
  nombre: { width: 64, textAlign: "center" },
  poids: { width: 64, textAlign: "right" },
  prix: { width: 58, textAlign: "right" },
  total: { width: 118, textAlign: "right" },
  productCell: {
    paddingTop: 7,
    justifyContent: "flex-start",
  },
  amountRow: {
    flexDirection: "row",
    marginTop: 15,
    minHeight: 106,
  },
  amountLeft: {
    flex: 1,
    paddingLeft: 6,
  },
  sentenceLabel: {
    fontWeight: 700,
    marginBottom: 12,
  },
  sentenceValue: {
    fontWeight: 700,
    lineHeight: 1.5,
  },
  rightAmounts: {
    width: 154,
    marginLeft: 12,
  },
  caisses: {
    height: 28,
    border: `1 solid ${BORDURE}`,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  caissesLabel: {
    flex: 1,
    textAlign: "center",
    fontWeight: 700,
  },
  totalBox: {
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 5,
    overflow: "hidden",
  },
  totalLine: {
    flexDirection: "row",
    minHeight: 27,
  },
  totalLabel: {
    width: 78,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingLeft: 11,
    justifyContent: "center",
    fontWeight: 700,
  },
  totalValue: {
    flex: 1,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingRight: 10,
    justifyContent: "center",
    textAlign: "right",
    fontWeight: 700,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 92,
  },
  paymentTable: {
    width: 310,
    marginLeft: 6,
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
  },
  paymentRow: {
    flexDirection: "row",
  },
  paymentCell: {
    width: 103.33,
    minHeight: 25,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 7.5,
    fontWeight: 700,
  },
  rulesBox: {
    width: 180,
    marginLeft: 6,
    marginTop: 27,
    border: `1 solid ${BORDURE}`,
  },
  rulesTitle: {
    backgroundColor: GRIS,
    color: "#ffffff",
    textAlign: "center",
    paddingVertical: 6,
    fontWeight: 700,
  },
  rulesText: {
    padding: 6,
    fontSize: 6.5,
    lineHeight: 1.3,
  },
  stampWrap: {
    flex: 1,
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  stamp: {
    width: 82,
    height: 82,
    border: `2 solid ${GRIS}`,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.65,
  },
  stampText: {
    textAlign: "center",
    fontSize: 7,
    color: "#344e8a",
    fontWeight: 700,
  },
  netBox: {
    width: 104,
    marginTop: 0,
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
  },
  netHead: {
    height: 32,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingTop: 9,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
  },
  netValue: {
    height: 47,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingTop: 16,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 12,
    borderTop: `1 solid ${ROUGE}`,
    paddingTop: 5,
    textAlign: "center",
    color: ROUGE,
    fontSize: 6.5,
    fontWeight: 700,
  },
});

export function BonLivraisonPdf({ commande }: { commande: CommandeDocumentData }) {
  const lignes = lignesAvecBlancs(commande.lignes, 4);

  return (
    <Document title={`BL ${commande.numeroBl}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoWrap}>
          {commande.societe.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={commande.societe.logo} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>COQ PLUS</Text>
            </View>
          )}
        </View>

        <View style={styles.topRow}>
          <View style={styles.leftHeader}>
            <View style={styles.blBox}>
              <Text style={styles.blLabel}>BL No :</Text>
              <Text style={styles.blValue}>{commande.numeroBl}</Text>
            </View>
            <View style={styles.metaGrid}>
              <MetaCell label="DATE" value={commande.date} />
              <MetaCell label="CODE CLIENT" value={commande.codeClient} />
              <MetaCell label="No CDM CLIENT" value="" />
            </View>
          </View>

          <View style={styles.clientBox}>
            <Text style={styles.clientName}>{commande.client}</Text>
            <Text style={styles.clientLine}>-</Text>
            <Text style={styles.clientLine}>{commande.ville}</Text>
            <Text style={styles.clientFiscal}>ICE : -</Text>
          </View>
        </View>

        <View style={styles.siteLine}>
          <Text style={styles.siteLabel}>Site de livraison :</Text>
          <Text style={styles.siteValue}>{commande.client}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.designation, styles.headText]}>Désignation</Text>
            <Text style={[styles.tableCell, styles.nombre, styles.headText]}>NOMBRE</Text>
            <Text style={[styles.tableCell, styles.poids, styles.headText]}>POIDS KG</Text>
            <Text style={[styles.tableCell, styles.prix, styles.headText]}>PRIX UNIT</Text>
            <Text style={[styles.tableCell, styles.total, styles.headText]}>TOTAL</Text>
          </View>
          {lignes.map((ligne, index) => (
            <View key={`${ligne.produit}-${index}`} style={[styles.row, { minHeight: 20 }]}>
              <Text style={[styles.tableCell, styles.designation, styles.productCell]}>
                {ligne.produit}
              </Text>
              <Text style={[styles.tableCell, styles.nombre]}>{ligne.nombre}</Text>
              <Text style={[styles.tableCell, styles.poids]}>{ligne.quantite}</Text>
              <Text style={[styles.tableCell, styles.prix]}>{ligne.prixUnitaire}</Text>
              <Text style={[styles.tableCell, styles.total]}>{ligne.prixNet}</Text>
            </View>
          ))}
          <View style={[styles.row, { height: 150 }]}>
            <Text style={[styles.tableCell, styles.designation]} />
            <Text style={[styles.tableCell, styles.nombre]} />
            <Text style={[styles.tableCell, styles.poids]} />
            <Text style={[styles.tableCell, styles.prix]} />
            <Text style={[styles.tableCell, styles.total]} />
          </View>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountLeft}>
            <Text style={styles.sentenceLabel}>Arrêtée le Présent BL à la Somme de :</Text>
            <Text style={styles.sentenceValue}>{commande.montantEnLettres}</Text>
          </View>
          <View style={styles.rightAmounts}>
            <View style={styles.caisses}>
              <Text style={styles.caissesLabel}>Nbr caisses :</Text>
            </View>
            <View style={styles.totalBox}>
              <TotalLine label="Total HT" value={commande.totalHt} />
              <TotalLine label={`TVA ${commande.tauxTva}%`} value={commande.tva} />
              <TotalLine label="Total TTC" value={commande.totalTtc} />
            </View>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <View style={styles.paymentTable}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentCell}>Mode de reglement</Text>
                <Text style={styles.paymentCell}>Condition paiement</Text>
                <Text style={styles.paymentCell}>Date echeance</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentCell} />
                <Text style={styles.paymentCell} />
                <Text style={styles.paymentCell} />
              </View>
            </View>
            <View style={styles.rulesBox}>
              <Text style={styles.rulesTitle}>CONDITIONS DE REGLEMENT</Text>
              <Text style={styles.rulesText}>
                LOI 32-10 - 78.17/82.78.3{"\n"}
                CLAUSE DE RESERVE DE PROPRIETE{"\n"}
                APPLICABLE
              </Text>
            </View>
          </View>

          <View style={styles.stampWrap}>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>{commande.societe.raisonSociale}</Text>
              <Text style={styles.stampText}>RC {commande.societe.rc || "-"}</Text>
              <Text style={styles.stampText}>ICE {commande.societe.ice || "-"}</Text>
            </View>
          </View>

          <View style={styles.netBox}>
            <Text style={styles.netHead}>NET A PAYER</Text>
            <Text style={styles.netValue}>{commande.totalTtc}</Text>
          </View>
        </View>

        <Text style={styles.footer}>{footerSociete(commande)}</Text>
      </Page>
    </Document>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <View style={styles.metaHead}>
        <Text>{label}</Text>
      </View>
      <View style={styles.metaValue}>
        <Text>{value}</Text>
      </View>
    </View>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalLine}>
      <View style={styles.totalLabel}>
        <Text>{label}</Text>
      </View>
      <View style={styles.totalValue}>
        <Text>{value}</Text>
      </View>
    </View>
  );
}

type LignePdf = CommandeDocumentData["lignes"][number] & { nombre: string };

function lignesAvecBlancs(lignes: CommandeDocumentData["lignes"], minimum: number): LignePdf[] {
  const remplies = lignes.map((ligne) => ({ ...ligne, nombre: "" }));
  const blancs = Array.from({ length: Math.max(0, minimum - remplies.length) }, () => ({
    produit: "",
    nombre: "",
    quantite: "",
    prixUnitaire: "",
    prixNet: "",
  }));

  return [...remplies, ...blancs];
}

function footerSociete({ societe }: CommandeDocumentData): string {
  const infos = [
    `${societe.raisonSociale}, Siege social : ${societe.adresse || "-"}`,
    societe.rc ? `RC : ${societe.rc}` : undefined,
    societe.ice ? `ICE : ${societe.ice}` : undefined,
    societe.identifiantFiscal ? `IF : ${societe.identifiantFiscal}` : undefined,
    societe.patente ? `TP : ${societe.patente}` : undefined,
    societe.telephone ? `Tel : ${societe.telephone}` : undefined,
  ].filter(Boolean);

  return infos.join(" - ");
}
