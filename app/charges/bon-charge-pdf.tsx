import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { BonChargeDocumentData } from "./document-data";

Font.registerHyphenationCallback((word) => [word]);

const BORDURE = "#202020";
const FOND_GRIS = "#eeeeee";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 32,
    paddingBottom: 32,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#111111",
    backgroundColor: "#ffffff",
  },
  header: {
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain",
    marginBottom: 5,
  },
  logoFallback: {
    width: 48,
    height: 48,
    border: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  logoFallbackText: {
    fontSize: 7,
    fontWeight: 700,
    textAlign: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 5,
  },
  metadata: {
    fontSize: 7.2,
    textAlign: "center",
    color: "#333333",
  },
  table: {
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    minHeight: 23,
  },
  headerRow: {
    minHeight: 24,
    backgroundColor: FOND_GRIS,
  },
  cell: {
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  productCell: {
    flex: 1,
    textAlign: "center",
  },
  quantityCell: {
    width: 110,
    textAlign: "center",
  },
  amountCell: {
    width: 130,
    textAlign: "center",
  },
  headText: {
    fontWeight: 700,
    textAlign: "center",
  },
  totalRow: {
    fontWeight: 700,
    backgroundColor: FOND_GRIS,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 0,
    marginTop: 38,
  },
  signatureBox: {
    flex: 1,
    minHeight: 68,
    border: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
  },
  signatureTitle: {
    fontSize: 7,
  },
});

export function BonChargePdf({ bon }: { bon: BonChargeDocumentData }) {
  return (
    <Document title={`Bon de charge ${bon.numeroBc}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {bon.societe.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={bon.societe.logo} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>LOGO</Text>
            </View>
          )}
          <Text style={styles.title}>Bon de Charge</Text>
          <Text style={styles.metadata}>
            {`Date : ${bon.creeLe}  |  Commercial : ${bon.commercial}`}
          </Text>
        </View>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.productCell, styles.headText]}>Produit</Text>
            <Text style={[styles.cell, styles.quantityCell, styles.headText]}>
              Qte totale
            </Text>
            <Text style={[styles.cell, styles.amountCell, styles.headText]}>
              Montant (DH)
            </Text>
          </View>
          {bon.lignes.map((ligne, index) => (
            <View key={`${ligne.produit}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.productCell]}>{ligne.produit}</Text>
              <Text style={[styles.cell, styles.quantityCell]}>{ligne.quantite}</Text>
              <Text style={[styles.cell, styles.amountCell]}>{ligne.montant ?? "-"}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.cell, styles.productCell]}>TOTAL</Text>
            <Text style={[styles.cell, styles.quantityCell]}> </Text>
            <Text style={[styles.cell, styles.amountCell]}>
              {bon.totalMontant ? `${bon.totalMontant} DH` : "-"}
            </Text>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Signature Controleur</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Signature Commercial</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
