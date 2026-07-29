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
import type { BonChargeConsolideData } from "./bon-charge-consolide-data";

Font.registerHyphenationCallback((word) => [word]);

const NOIR = "#1a1a1a";
const GRIS = "#555555";
const BORDURE = "#333333";
const FOND_ENTETE = "#f0f0f0";
const FOND_TOTAL = "#e9e9e9";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 34,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: NOIR,
    backgroundColor: "#ffffff",
  },
  entete: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 78,
    height: 78,
    objectFit: "contain",
    marginBottom: 6,
  },
  logoFallback: {
    width: 78,
    height: 78,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    border: `1.5 solid ${BORDURE}`,
    marginBottom: 6,
  },
  logoFallbackText: {
    fontSize: 9,
    fontWeight: 700,
    color: NOIR,
    textAlign: "center",
  },
  titre: {
    fontSize: 17,
    fontWeight: 700,
    color: NOIR,
    marginBottom: 6,
  },
  sousTitre: {
    fontSize: 9.5,
    color: GRIS,
    marginBottom: 18,
  },
  table: {
    borderTop: `1 solid ${BORDURE}`,
    borderLeft: `1 solid ${BORDURE}`,
  },
  row: {
    flexDirection: "row",
  },
  headerRow: {
    backgroundColor: FOND_ENTETE,
  },
  cell: {
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingVertical: 7,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  produitCell: {
    flex: 1,
    textAlign: "center",
  },
  qteCell: {
    width: 110,
    textAlign: "center",
  },
  montantCell: {
    width: 130,
    textAlign: "center",
  },
  headText: {
    fontWeight: 700,
    color: NOIR,
  },
  qteValue: {
    textAlign: "center",
  },
  montantValue: {
    textAlign: "right",
  },
  totalRow: {
    backgroundColor: FOND_TOTAL,
  },
  totalLabel: {
    fontWeight: 700,
    textAlign: "center",
  },
  totalValue: {
    fontWeight: 700,
    textAlign: "right",
  },
  note: {
    marginTop: 12,
    fontSize: 8,
    color: GRIS,
    lineHeight: 1.4,
  },
  signatureRow: {
    flexDirection: "row",
    marginTop: 46,
    borderTop: `1 solid ${BORDURE}`,
    borderLeft: `1 solid ${BORDURE}`,
  },
  signatureBox: {
    flex: 1,
    minHeight: 66,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
  },
  signatureText: {
    fontSize: 9.5,
    color: NOIR,
  },
});

export function BonChargeConsolidePdf({ data }: { data: BonChargeConsolideData }) {
  return (
    <Document title="Bon de charge">
      <Page size="A4" style={styles.page}>
        <View style={styles.entete}>
          {data.societe.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={data.societe.logo} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>
                {data.societe.raisonSociale}
              </Text>
            </View>
          )}
          <Text style={styles.titre}>Bon de Charge</Text>
          <Text style={styles.sousTitre}>
            Date : {data.genereLe}   |   Commercial : {data.commercial}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.produitCell, styles.headText]}>
              Produit
            </Text>
            <Text style={[styles.cell, styles.qteCell, styles.headText]}>
              Qte totale
            </Text>
            <Text style={[styles.cell, styles.montantCell, styles.headText]}>
              Montant (DH)
            </Text>
          </View>

          {data.lignes.map((ligne, index) => (
            <View key={`${ligne.produit}-${index}`} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.produitCell]}>{ligne.produit}</Text>
              <Text style={[styles.cell, styles.qteCell, styles.qteValue]}>
                {ligne.quantite}
              </Text>
              <Text style={[styles.cell, styles.montantCell, styles.montantValue]}>
                {ligne.montant}
              </Text>
            </View>
          ))}

          <View style={[styles.row, styles.totalRow]} wrap={false}>
            <Text style={[styles.cell, styles.produitCell, styles.totalLabel]}>
              TOTAL
            </Text>
            <Text style={[styles.cell, styles.qteCell]}> </Text>
            <Text style={[styles.cell, styles.montantCell, styles.totalValue]}>
              {data.totalMontant} DH
            </Text>
          </View>
        </View>

        {data.note ? <Text style={styles.note}>{data.note}</Text> : null}

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Signature Controleur</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Signature Commercial</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
