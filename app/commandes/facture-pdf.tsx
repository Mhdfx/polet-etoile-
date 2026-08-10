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

const ROUGE = "#c1121f";
const ROUGE_FONCE = "#8f0d17";
const TEXTE = "#182230";
const GRIS = "#667085";
const BORDURE = "#d0d5dd";
const FOND = "#f8fafc";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 32,
    paddingBottom: 32,
    fontFamily: "Helvetica",
    fontSize: 8.7,
    color: TEXTE,
    backgroundColor: "#ffffff",
  },
  topBar: {
    height: 7,
    backgroundColor: ROUGE,
    marginHorizontal: -32,
    marginTop: -28,
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  brand: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    width: 285,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },
  logoFallback: {
    width: 58,
    height: 58,
    border: `2 solid ${ROUGE}`,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: ROUGE,
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
  companyName: {
    color: ROUGE_FONCE,
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 4,
  },
  companyLine: {
    color: GRIS,
    fontSize: 7.2,
    lineHeight: 1.25,
  },
  invoiceHead: {
    alignItems: "flex-end",
  },
  title: {
    color: ROUGE_FONCE,
    fontSize: 22,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  invoiceNumber: {
    marginTop: 7,
    border: `1 solid ${ROUGE}`,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    color: ROUGE_FONCE,
    fontWeight: 700,
  },
  blocks: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  block: {
    flex: 1,
    border: `1 solid ${BORDURE}`,
    borderRadius: 7,
    padding: 10,
    minHeight: 95,
  },
  blockTint: {
    backgroundColor: FOND,
  },
  label: {
    color: GRIS,
    fontSize: 6.8,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  strong: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  line: {
    fontSize: 8,
    lineHeight: 1.35,
    marginTop: 3,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  metaCard: {
    flex: 1,
    backgroundColor: FOND,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 8,
  },
  metaValue: {
    fontSize: 9.2,
    fontWeight: 700,
  },
  table: {
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 7,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    minHeight: 25,
  },
  headRow: {
    minHeight: 30,
    backgroundColor: ROUGE,
    color: "#ffffff",
  },
  cell: {
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  article: { width: 245 },
  qty: { width: 75, textAlign: "right" },
  unit: { width: 95, textAlign: "right" },
  amount: { width: 118, textAlign: "right" },
  headText: {
    fontWeight: 700,
    textAlign: "center",
  },
  productText: {
    fontWeight: 700,
  },
  bottomArea: {
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
    alignItems: "flex-start",
  },
  notes: {
    flex: 1,
  },
  amountWords: {
    border: `1 solid ${BORDURE}`,
    borderRadius: 7,
    padding: 10,
    minHeight: 72,
    marginBottom: 10,
  },
  amountWordsText: {
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.45,
  },
  summary: {
    width: 190,
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 7,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    minHeight: 27,
  },
  summaryLabel: {
    width: 98,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingLeft: 10,
    justifyContent: "center",
    fontWeight: 700,
  },
  summaryValue: {
    flex: 1,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingRight: 10,
    justifyContent: "center",
    textAlign: "right",
    fontWeight: 700,
  },
  netRow: {
    backgroundColor: ROUGE,
    color: "#ffffff",
    minHeight: 34,
  },
  companyStampWrap: {
    position: "absolute",
    right: 54,
    bottom: 48,
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  companyStamp: {
    width: 92,
    height: 92,
    objectFit: "contain",
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 16,
    borderTop: `1 solid ${ROUGE}`,
    paddingTop: 6,
    textAlign: "center",
    color: ROUGE_FONCE,
    fontSize: 6.4,
    fontWeight: 700,
  },
});

export function FacturePdf({ commande }: { commande: CommandeDocumentData }) {
  return (
    <Document title={`Facture ${commande.numeroFacture}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} fixed />
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            <Logo commande={commande} />
          </View>

          <View style={styles.invoiceHead}>
            <Text style={styles.title}>Facture</Text>
            <Text style={styles.invoiceNumber}>{commande.numeroFacture}</Text>
          </View>
        </View>

        <View style={styles.blocks} wrap={false}>
          <View style={[styles.block, styles.blockTint]}>
            <Text style={styles.label}>Facturé à</Text>
            <Text style={styles.strong}>{commande.client}</Text>
            <Text style={styles.line}>{commande.adresseClient}</Text>
            <Text style={styles.line}>{commande.ville}</Text>
            <Text style={styles.line}>Code client : {commande.codeClient}</Text>
          </View>

        </View>

        <View style={styles.metaGrid} wrap={false}>
          <MetaCard label="Total HT" value={`${commande.totalHt} DH`} />
          <MetaCard label={`TVA ${commande.tauxTva}%`} value={`${commande.tva} DH`} />
          <MetaCard label="Total TTC" value={`${commande.totalTtc} DH`} />
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]} fixed>
            <Text style={[styles.cell, styles.article, styles.headText]}>Article</Text>
            <Text style={[styles.cell, styles.qty, styles.headText]}>Quantité KG</Text>
            <Text style={[styles.cell, styles.unit, styles.headText]}>Prix unitaire</Text>
            <Text style={[styles.cell, styles.amount, styles.headText]}>Montant HT</Text>
          </View>
          {commande.lignes.map((ligne, index) => (
            <View key={`${ligne.produit}-${index}`} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.article, styles.productText]}>
                {ligne.produit}
              </Text>
              <Text style={[styles.cell, styles.qty]}>{ligne.quantite}</Text>
              <Text style={[styles.cell, styles.unit]}>{ligne.prixUnitaire}</Text>
              <Text style={[styles.cell, styles.amount]}>{ligne.prixNet}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomArea} wrap={false}>
          <View style={styles.notes}>
            <View style={styles.amountWords}>
              <Text style={styles.label}>Montant en lettres</Text>
              <Text style={styles.amountWordsText}>{commande.montantEnLettres}</Text>
            </View>
          </View>

          <View style={styles.summary}>
            <SummaryLine label="Total HT" value={commande.totalHt} />
            <SummaryLine label={`TVA ${commande.tauxTva}%`} value={commande.tva} />
            <SummaryLine label="Total TTC" value={commande.totalTtc} />
            <SummaryLine label="Payé" value={commande.totalPaye.replace(/\s?DH$/, "")} />
            <SummaryLine
              label="Net à payer"
              value={commande.resteDu.replace(/\s?DH$/, "")}
              important
            />
          </View>
        </View>

        <CompanyStamp commande={commande} />
      </Page>
    </Document>
  );
}

function Logo({ commande }: { commande: CommandeDocumentData }) {
  if (commande.societe.logo) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image src={commande.societe.logo} style={styles.logo} />;
  }

  return (
    <View style={styles.logoFallback}>
      <Text style={styles.logoFallbackText}>LOGO</Text>
    </View>
  );
}

function CompanyStamp({ commande }: { commande: CommandeDocumentData }) {
  if (!commande.societe.cachet) return null;

  return (
    <View style={styles.companyStampWrap}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={commande.societe.cachet} style={styles.companyStamp} />
    </View>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function SummaryLine({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string;
  important?: boolean;
}) {
  return (
    <View style={important ? [styles.summaryRow, styles.netRow] : styles.summaryRow}>
      <View style={styles.summaryLabel}>
        <Text>{label}</Text>
      </View>
      <View style={styles.summaryValue}>
        <Text>{value}</Text>
      </View>
    </View>
  );
}
