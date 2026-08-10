import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { BonChargeConsolideData } from "./bon-charge-consolide-data";

const TEXTE = "#111111";
const BORDURE = "#202020";
const FOND_GRIS = "#eeeeee";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 32,
    paddingBottom: 32,
    fontFamily: "Helvetica",
    fontSize: 8.7,
    color: TEXTE,
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
    borderTop: `1 solid ${BORDURE}`,
    borderLeft: `1 solid ${BORDURE}`,
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
    textAlign: "center",
  },
  totalRow: {
    fontWeight: 700,
    backgroundColor: FOND_GRIS,
  },
  note: {
    marginTop: 11,
    fontSize: 7,
    color: "#333333",
    lineHeight: 1.35,
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

export function BonChargeConsolidePdf({
  data,
}: {
  data: BonChargeConsolideData;
}) {
  return (
    <Document title="Bon de charge consolide">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {data.societe.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={data.societe.logo} style={styles.logo} />
          ) : null}
          <Text style={styles.title}>Bon de Charge</Text>
          <Text style={styles.metadata}>
            {`Date : ${data.genereLe}  |  Commercial : ${data.commercial}`}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
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
              <Text style={[styles.cell, styles.qteCell]}>{ligne.quantite}</Text>
              <Text style={[styles.cell, styles.montantCell]}>{ligne.montant}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]} wrap={false}>
            <Text style={[styles.cell, styles.produitCell]}>TOTAL</Text>
            <Text style={[styles.cell, styles.qteCell]}> </Text>
            <Text style={[styles.cell, styles.montantCell]}>
              {data.totalMontant} DH
            </Text>
          </View>
        </View>

        {data.note ? <Text style={styles.note}>{data.note}</Text> : null}

        <View style={styles.signatureRow} wrap={false}>
          <SignatureBox title="Signature Controleur" />
          <SignatureBox title="Signature Commercial" />
        </View>

      </Page>
    </Document>
  );
}

function SignatureBox({ title }: { title: string }) {
  return (
    <View style={styles.signatureBox}>
      <Text style={styles.signatureTitle}>{title}</Text>
    </View>
  );
}
