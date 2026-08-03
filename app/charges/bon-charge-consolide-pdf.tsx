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
    paddingBottom: 46,
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
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `2 solid ${ROUGE}`,
    paddingBottom: 12,
    marginBottom: 14,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 330,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    color: ROUGE_FONCE,
    marginBottom: 3,
  },
  companyLine: {
    fontSize: 7,
    color: GRIS,
    lineHeight: 1.3,
  },
  titleBlock: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: ROUGE_FONCE,
    textTransform: "uppercase",
  },
  badge: {
    marginTop: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    color: "#ffffff",
    backgroundColor: ROUGE,
    fontSize: 8,
    fontWeight: 700,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metaCard: {
    flex: 1,
    backgroundColor: FOND,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 9,
  },
  label: {
    color: GRIS,
    fontSize: 6.8,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  selectionBox: {
    backgroundColor: FOND,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 9,
    marginBottom: 12,
  },
  selectionText: {
    fontSize: 7.4,
    color: TEXTE,
    lineHeight: 1.35,
  },
  table: {
    borderTop: `1 solid ${BORDURE}`,
    borderLeft: `1 solid ${BORDURE}`,
  },
  row: {
    flexDirection: "row",
    minHeight: 30,
  },
  headerRow: {
    backgroundColor: ROUGE,
    color: "#ffffff",
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
  },
  qteCell: {
    width: 110,
    textAlign: "right",
  },
  montantCell: {
    width: 130,
    textAlign: "right",
  },
  headText: {
    fontWeight: 700,
    textAlign: "center",
  },
  totalRow: {
    backgroundColor: "#fff1f2",
    color: ROUGE_FONCE,
    fontWeight: 700,
  },
  note: {
    marginTop: 10,
    border: `1 solid ${BORDURE}`,
    borderRadius: 5,
    padding: 8,
    fontSize: 7.2,
    color: GRIS,
    lineHeight: 1.4,
    backgroundColor: FOND,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30,
  },
  signatureBox: {
    flex: 1,
    minHeight: 76,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 9,
  },
  signatureTitle: {
    color: GRIS,
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  signatureLine: {
    marginTop: "auto",
    borderTop: `1 solid ${BORDURE}`,
    paddingTop: 5,
    color: GRIS,
    fontSize: 7,
  },
  stampWrap: {
    position: "absolute",
    right: 42,
    bottom: 54,
    width: 84,
    height: 84,
  },
  stampImage: {
    width: 84,
    height: 84,
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
    fontSize: 6.2,
    fontWeight: 700,
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
        <View style={styles.topBar} fixed />
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            {data.societe.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.societe.logo} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.companyName}>{data.societe.raisonSociale}</Text>
              <Text style={styles.companyLine}>{data.societe.adresse || "-"}</Text>
              <Text style={styles.companyLine}>
                {identifiantsSociete(data.societe)}
              </Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Bon de charge</Text>
            <Text style={styles.badge}>CONSOLIDE</Text>
          </View>
        </View>

        <View style={styles.metaGrid} wrap={false}>
          <MetaCard label="Date de generation" value={data.genereLe} />
          <MetaCard label="Commercial" value={data.commercial} />
          <MetaCard
            label="Commandes consolidees"
            value={String(data.nombreCommandes)}
          />
        </View>

        <View style={styles.selectionBox} wrap={false}>
          <Text style={styles.label}>Bons de livraison inclus</Text>
          <Text style={styles.selectionText}>{data.commandes.join(", ")}</Text>
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
          <SignatureBox title="Controle depot" />
          <SignatureBox title="Commercial" />
        </View>

        {data.societe.cachet ? (
          <View style={styles.stampWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.societe.cachet} style={styles.stampImage} />
          </View>
        ) : null}
        <Text style={styles.footer} fixed>
          {footerSociete(data)}
        </Text>
      </Page>
    </Document>
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

function SignatureBox({ title }: { title: string }) {
  return (
    <View style={styles.signatureBox}>
      <Text style={styles.signatureTitle}>{title}</Text>
      <Text style={styles.signatureLine}>Nom, signature et cachet</Text>
    </View>
  );
}

function identifiantsSociete(
  societe: BonChargeConsolideData["societe"],
): string {
  return [
    societe.rc ? `RC : ${societe.rc}` : undefined,
    societe.ice ? `ICE : ${societe.ice}` : undefined,
    societe.identifiantFiscal ? `IF : ${societe.identifiantFiscal}` : undefined,
    societe.patente ? `TP : ${societe.patente}` : undefined,
  ]
    .filter(Boolean)
    .join(" - ");
}

function footerSociete({ societe }: BonChargeConsolideData): string {
  return [
    `${societe.raisonSociale}, Siege social : ${societe.adresse || "-"}`,
    identifiantsSociete(societe),
    `Tel : ${societe.telephone || "+212 660924488"}`,
  ]
    .filter((valeur) => valeur && valeur !== "-")
    .join(" - ");
}
