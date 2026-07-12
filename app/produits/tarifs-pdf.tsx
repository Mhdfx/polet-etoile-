import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type TarifProduit = {
  nom: string;
  prix: string;
};

export type TarifsDocumentData = {
  date: string;
  societe: {
    raisonSociale: string;
    adresse?: string;
    telephone?: string;
    ice?: string;
    identifiantFiscal?: string;
    logo?: string;
    cachet?: string;
  };
  produits: TarifProduit[];
};

const VERT = "#70ad47";
const BLEU = "#1f4e8c";
const GRIS = "#b7b7b7";

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingHorizontal: 54,
    paddingBottom: 42,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#111111",
  },
  header: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },
  logoFallback: {
    width: 86,
    height: 48,
    border: `2 solid ${VERT}`,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    color: "#1f6b36",
    fontSize: 11,
    fontWeight: 700,
  },
  titleBox: {
    alignSelf: "center",
    width: 290,
    border: "1 solid #777777",
    borderRadius: 5,
    backgroundColor: GRIS,
    paddingVertical: 7,
    marginBottom: 18,
  },
  titleBoxText: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "underline",
    marginBottom: 14,
  },
  table: {
    alignSelf: "center",
    width: 330,
    borderLeft: "1 solid #222222",
    borderTop: "1 solid #222222",
  },
  row: {
    flexDirection: "row",
    height: 14,
  },
  headCell: {
    backgroundColor: VERT,
    color: "#ffffff",
    fontWeight: 700,
    textAlign: "center",
  },
  cell: {
    borderRight: "1 solid #222222",
    borderBottom: "1 solid #222222",
    paddingHorizontal: 5,
    justifyContent: "center",
    fontSize: 8.4,
  },
  article: {
    width: 210,
    fontWeight: 700,
  },
  price: {
    width: 120,
    textAlign: "center",
    fontWeight: 700,
  },
  watermarkWrap: {
    position: "absolute",
    left: 150,
    top: 238,
    width: 300,
    height: 300,
    opacity: 0.08,
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkText: {
    color: BLEU,
    fontSize: 50,
    fontWeight: 700,
    textAlign: "center",
  },
  stamp: {
    alignSelf: "center",
    width: 66,
    height: 66,
    objectFit: "contain",
    marginTop: 18,
  },
  note: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 6.6,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    left: 54,
    right: 54,
    bottom: 20,
    textAlign: "center",
    color: "#1f7a35",
    fontSize: 7.2,
    fontWeight: 700,
    lineHeight: 1.35,
  },
});

export function TarifsPdf({ data }: { data: TarifsDocumentData }) {
  return (
    <Document title={`Tarifs ${data.date}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.watermarkWrap}>
          <Text style={styles.watermarkText}>{data.societe.raisonSociale}</Text>
        </View>

        <View style={styles.header}>
          {data.societe.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={data.societe.logo} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text>COQ PLUS</Text>
            </View>
          )}
        </View>

        <View style={styles.titleBox}>
          <Text style={styles.titleBoxText}>Tarifs du {data.date}</Text>
        </View>

        <Text style={styles.subtitle}>LISTE DES PRIX</Text>

        <View style={styles.table} wrap={false}>
          <View style={styles.row} wrap={false}>
            <Text style={[styles.cell, styles.article, styles.headCell]}>ARTICLE</Text>
            <Text style={[styles.cell, styles.price, styles.headCell]}>PRIX EN KG</Text>
          </View>
          {data.produits.map((produit) => (
            <View key={produit.nom} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.article]}>{produit.nom}</Text>
              <Text style={[styles.cell, styles.price]}>{produit.prix}</Text>
            </View>
          ))}
        </View>

        {data.societe.cachet ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={data.societe.cachet} style={styles.stamp} />
        ) : null}

        <Text style={styles.note}>***le tarif risque de changer pendant la semaine</Text>

        <Text style={styles.footer}>{footerSociete(data)}</Text>
      </Page>
    </Document>
  );
}

function footerSociete({ societe }: TarifsDocumentData): string {
  const telephone = societe.telephone || "+212626184088";
  const lignes = [
    `${societe.raisonSociale}, Siege social : ${societe.adresse || "-"}`,
    `GSM : ${telephone}`,
    societe.ice ? `ICE : ${societe.ice}` : undefined,
    societe.identifiantFiscal ? `IF : ${societe.identifiantFiscal}` : undefined,
  ].filter(Boolean);

  return lignes.join(" - ");
}
