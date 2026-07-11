import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { BonChargeDocumentData } from "./document-data";

const BLEU = "#0f66d5";
const BLEU_FONCE = "#12315f";
const BORDURE = "#c9d2de";
const GRIS = "#667085";
const FOND = "#f3f6fa";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#172033",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `2 solid ${BLEU}`,
    paddingBottom: 14,
    marginBottom: 18,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },
  logoFallback: {
    width: 58,
    height: 58,
    border: `2 solid ${BLEU}`,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef5ff",
  },
  logoFallbackText: {
    color: BLEU_FONCE,
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
  companyName: {
    fontSize: 15,
    fontWeight: 700,
    color: BLEU_FONCE,
    marginBottom: 4,
  },
  companyMeta: {
    fontSize: 7.5,
    color: GRIS,
    lineHeight: 1.25,
  },
  titleBox: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: BLEU_FONCE,
    textTransform: "uppercase",
  },
  numero: {
    marginTop: 6,
    border: `1 solid ${BLEU}`,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    color: BLEU_FONCE,
    fontWeight: 700,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metaCard: {
    flex: 1,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 10,
    backgroundColor: FOND,
  },
  metaLabel: {
    fontSize: 7,
    color: GRIS,
    textTransform: "uppercase",
    marginBottom: 5,
    fontWeight: 700,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#172033",
  },
  sectionTitle: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: 700,
    color: BLEU_FONCE,
  },
  table: {
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    minHeight: 28,
  },
  headerRow: {
    backgroundColor: BLEU_FONCE,
    color: "#ffffff",
    minHeight: 30,
  },
  cell: {
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  productCell: {
    flex: 1,
  },
  quantityCell: {
    width: 140,
    textAlign: "right",
  },
  headText: {
    fontWeight: 700,
  },
  totalRow: {
    backgroundColor: FOND,
    fontWeight: 700,
  },
  commentBox: {
    marginTop: 14,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 10,
  },
  commentText: {
    color: "#344054",
    lineHeight: 1.4,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 34,
  },
  signatureBox: {
    flex: 1,
    minHeight: 74,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 10,
  },
  signatureTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: GRIS,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 18,
    borderTop: `1 solid ${BORDURE}`,
    paddingTop: 7,
    textAlign: "center",
    color: GRIS,
    fontSize: 7,
  },
});

export function BonChargePdf({ bon }: { bon: BonChargeDocumentData }) {
  return (
    <Document title={`Bon de charge ${bon.numeroBc}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {bon.societe.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={bon.societe.logo} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>COQ PLUS</Text>
              </View>
            )}
            <View>
              <Text style={styles.companyName}>{bon.societe.raisonSociale}</Text>
              <Text style={styles.companyMeta}>{bon.societe.adresse || "-"}</Text>
              <Text style={styles.companyMeta}>{identifiantsSociete(bon)}</Text>
            </View>
          </View>

          <View style={styles.titleBox}>
            <Text style={styles.title}>Bon de charge</Text>
            <Text style={styles.numero}>{bon.numeroBc}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <MetaCard label="Commercial" value={bon.commercial} />
          <MetaCard label="Date tournee" value={bon.dateCharge} />
          <MetaCard label="Commande source" value={bon.commande?.numeroBl || "Saisie manuelle"} />
        </View>

        <View style={styles.metaGrid}>
          <MetaCard label="Saisi par" value={bon.createur} />
          <MetaCard label="Date de creation" value={bon.creeLe} />
          <MetaCard label="Total charge" value={bon.totalKg} />
        </View>

        <Text style={styles.sectionTitle}>Produits charges</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.productCell, styles.headText]}>Produit</Text>
            <Text style={[styles.cell, styles.quantityCell, styles.headText]}>
              Quantite chargee
            </Text>
          </View>
          {bon.lignes.map((ligne, index) => (
            <View key={`${ligne.produit}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.productCell]}>{ligne.produit}</Text>
              <Text style={[styles.cell, styles.quantityCell]}>{ligne.quantite}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={[styles.cell, styles.productCell]}>TOTAL</Text>
            <Text style={[styles.cell, styles.quantityCell]}>{bon.totalKg}</Text>
          </View>
        </View>

        {bon.commentaire ? (
          <View style={styles.commentBox}>
            <Text style={styles.metaLabel}>Commentaire</Text>
            <Text style={styles.commentText}>{bon.commentaire}</Text>
          </View>
        ) : null}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Signature depot</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Signature commercial</Text>
          </View>
        </View>

        <Text style={styles.footer}>{footerSociete(bon)}</Text>
      </Page>
    </Document>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function identifiantsSociete({ societe }: BonChargeDocumentData): string {
  const valeurs = [
    societe.rc ? `RC : ${societe.rc}` : undefined,
    societe.ice ? `ICE : ${societe.ice}` : undefined,
    societe.identifiantFiscal ? `IF : ${societe.identifiantFiscal}` : undefined,
    societe.patente ? `TP : ${societe.patente}` : undefined,
  ].filter(Boolean);

  return valeurs.length > 0 ? valeurs.join(" - ") : "-";
}

function footerSociete({ societe }: BonChargeDocumentData): string {
  const telephone = societe.telephone || "+212626184088";
  return [
    `${societe.raisonSociale}, Siege social : ${societe.adresse || "-"}`,
    identifiantsSociete({ societe } as BonChargeDocumentData),
    `Tel : ${telephone}`,
  ]
    .filter((valeur) => valeur && valeur !== "-")
    .join(" - ");
}
