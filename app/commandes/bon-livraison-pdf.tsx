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
const TEXTE = "#1f2937";
const GRIS = "#667085";
const BORDURE = "#cfd6df";
const FOND = "#f7f9fc";

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingHorizontal: 30,
    paddingBottom: 30,
    fontFamily: "Helvetica",
    fontSize: 8.6,
    color: TEXTE,
    backgroundColor: "#ffffff",
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
    width: 270,
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
    fontSize: 14,
    fontWeight: 700,
    color: ROUGE_FONCE,
    marginBottom: 3,
  },
  companyLine: {
    fontSize: 7.2,
    color: GRIS,
    lineHeight: 1.25,
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
  numberPill: {
    marginTop: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    color: "#ffffff",
    backgroundColor: ROUGE,
    fontSize: 10,
    fontWeight: 700,
  },
  grid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 9,
    backgroundColor: "#ffffff",
  },
  tintedCard: {
    backgroundColor: FOND,
  },
  label: {
    fontSize: 6.8,
    color: GRIS,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 4,
  },
  value: {
    fontSize: 9.2,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  smallValue: {
    fontSize: 8,
    lineHeight: 1.35,
  },
  deliveryBox: {
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    backgroundColor: FOND,
  },
  deliveryTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: ROUGE_FONCE,
    marginBottom: 5,
  },
  deliveryText: {
    lineHeight: 1.35,
  },
  table: {
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    minHeight: 24,
  },
  headRow: {
    minHeight: 28,
    backgroundColor: ROUGE,
    color: "#ffffff",
  },
  cell: {
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingHorizontal: 7,
    justifyContent: "center",
  },
  designation: { width: 230 },
  nombre: { width: 58, textAlign: "center" },
  poids: { width: 70, textAlign: "right" },
  prix: { width: 78, textAlign: "right" },
  total: { width: 99, textAlign: "right" },
  headText: {
    fontWeight: 700,
    textAlign: "center",
  },
  productText: {
    fontWeight: 700,
  },
  totalsArea: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
  },
  lettersBox: {
    flex: 1,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 10,
    minHeight: 74,
  },
  lettersTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: ROUGE_FONCE,
    marginBottom: 8,
  },
  lettersText: {
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.45,
  },
  totalsBox: {
    width: 170,
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 6,
    overflow: "hidden",
  },
  totalLine: {
    flexDirection: "row",
    minHeight: 25,
  },
  totalLabel: {
    width: 86,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingLeft: 9,
    justifyContent: "center",
    fontWeight: 700,
  },
  totalValue: {
    flex: 1,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingRight: 9,
    justifyContent: "center",
    textAlign: "right",
    fontWeight: 700,
  },
  paymentAndSignatures: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    alignItems: "flex-start",
  },
  paymentBox: {
    width: 215,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 9,
    minHeight: 96,
  },
  paymentGrid: {
    marginTop: 6,
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
  },
  paymentRow: {
    flexDirection: "row",
  },
  paymentCell: {
    flex: 1,
    minHeight: 22,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 7,
    fontWeight: 700,
  },
  signatureBox: {
    flex: 1,
    minHeight: 96,
    border: `1 solid ${BORDURE}`,
    borderRadius: 6,
    padding: 9,
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
    right: 44,
    bottom: 52,
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  stampImage: {
    width: 92,
    height: 92,
    objectFit: "contain",
  },
  stampFallback: {
    width: 76,
    height: 76,
    border: `2 solid ${ROUGE}`,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.65,
  },
  stampText: {
    textAlign: "center",
    fontSize: 6.5,
    color: ROUGE_FONCE,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: 16,
    borderTop: `1 solid ${ROUGE}`,
    paddingTop: 6,
    textAlign: "center",
    color: ROUGE_FONCE,
    fontSize: 6.4,
    fontWeight: 700,
  },
});

export function BonLivraisonPdf({ commande }: { commande: CommandeDocumentData }) {
  return (
    <Document title={`BL ${commande.numeroBl}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            <Logo commande={commande} />
            <View>
              <Text style={styles.companyName}>{commande.societe.raisonSociale}</Text>
              <Text style={styles.companyLine}>{commande.societe.adresse || "-"}</Text>
              <Text style={styles.companyLine}>{identifiantsSociete(commande)}</Text>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Bon de livraison</Text>
            <Text style={styles.numberPill}>{commande.numeroBl}</Text>
          </View>
        </View>

        <View style={styles.grid} wrap={false}>
          <InfoCard label="Date BL" value={commande.date} />
          <InfoCard label="Code client" value={commande.codeClient} />
          <InfoCard label="Commercial" value={commande.commercial} />
        </View>

        <View style={styles.grid} wrap={false}>
          <InfoCard
            label="Client livre"
            value={commande.client}
            detail={`${commande.ville}\n${commande.adresseClient}`}
            tinted
          />
          <InfoCard
            label="Suivi livraison"
            value="Marchandise livrée en kg"
            detail="À vérifier et signer à la réception."
            tinted
          />
        </View>

        <View style={styles.deliveryBox} wrap={false}>
          <Text style={styles.deliveryTitle}>Site de livraison</Text>
          <Text style={styles.deliveryText}>
            {commande.client} - {commande.adresseClient !== "-" ? commande.adresseClient : commande.ville}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]} fixed>
            <Text style={[styles.cell, styles.designation, styles.headText]}>Désignation</Text>
            <Text style={[styles.cell, styles.nombre, styles.headText]}>Nombre</Text>
            <Text style={[styles.cell, styles.poids, styles.headText]}>Poids KG</Text>
            <Text style={[styles.cell, styles.prix, styles.headText]}>Prix unit</Text>
            <Text style={[styles.cell, styles.total, styles.headText]}>Total</Text>
          </View>
          {commande.lignes.map((ligne, index) => (
            <View key={`${ligne.produit}-${index}`} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.designation, styles.productText]}>
                {ligne.produit}
              </Text>
              <Text style={[styles.cell, styles.nombre]} />
              <Text style={[styles.cell, styles.poids]}>{ligne.quantite}</Text>
              <Text style={[styles.cell, styles.prix]}>{ligne.prixUnitaire}</Text>
              <Text style={[styles.cell, styles.total]}>{ligne.prixNet}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsArea} wrap={false}>
          <View style={styles.lettersBox}>
            <Text style={styles.lettersTitle}>Arrêtée la présente livraison à la somme de :</Text>
            <Text style={styles.lettersText}>{commande.montantEnLettres}</Text>
          </View>
          <View style={styles.totalsBox}>
            <TotalLine label="Total HT" value={commande.totalHt} />
            <TotalLine label={`TVA ${commande.tauxTva}%`} value={commande.tva} />
            <TotalLine label="Total TTC" value={commande.totalTtc} />
          </View>
        </View>

        <View style={styles.paymentAndSignatures} wrap={false}>
          <View style={styles.paymentBox}>
            <Text style={styles.label}>Règlement</Text>
            <Text style={styles.smallValue}>
              Ce bon de livraison accompagne la marchandise. La facture et le suivi de
              paiement restent gérés par l&apos;administration.
            </Text>
            <View style={styles.paymentGrid}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentCell}>Mode</Text>
                <Text style={styles.paymentCell}>Condition</Text>
                <Text style={styles.paymentCell}>Échéance</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentCell} />
                <Text style={styles.paymentCell} />
                <Text style={styles.paymentCell} />
              </View>
            </View>
          </View>

          <SignatureBox title="Réception client" />
          <SignatureBox title="Livreur / dépôt" />
        </View>

        <Stamp commande={commande} />
        <Text style={styles.footer} fixed>
          {footerSociete(commande)}
        </Text>
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
      <Text style={styles.logoFallbackText}>COQ PLUS</Text>
    </View>
  );
}

function InfoCard({
  label,
  value,
  detail,
  tinted = false,
}: {
  label: string;
  value: string;
  detail?: string;
  tinted?: boolean;
}) {
  return (
    <View style={tinted ? [styles.card, styles.tintedCard] : styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
      {detail ? <Text style={styles.smallValue}>{detail}</Text> : null}
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

function SignatureBox({ title }: { title: string }) {
  return (
    <View style={styles.signatureBox}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.signatureLine}>Nom, signature et cachet</Text>
    </View>
  );
}

function Stamp({ commande }: { commande: CommandeDocumentData }) {
  return (
    <View style={styles.stampWrap} fixed>
      {commande.societe.cachet ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={commande.societe.cachet} style={styles.stampImage} />
      ) : (
        <View style={styles.stampFallback}>
          <Text style={styles.stampText}>{commande.societe.raisonSociale}</Text>
          <Text style={styles.stampText}>RC {commande.societe.rc || "-"}</Text>
          <Text style={styles.stampText}>ICE {commande.societe.ice || "-"}</Text>
        </View>
      )}
    </View>
  );
}

function identifiantsSociete({ societe }: CommandeDocumentData): string {
  const valeurs = [
    societe.rc ? `RC : ${societe.rc}` : undefined,
    societe.ice ? `ICE : ${societe.ice}` : undefined,
    societe.identifiantFiscal ? `IF : ${societe.identifiantFiscal}` : undefined,
    societe.patente ? `TP : ${societe.patente}` : undefined,
  ].filter(Boolean);

  return valeurs.length > 0 ? valeurs.join(" - ") : "-";
}

function footerSociete({ societe }: CommandeDocumentData): string {
  const telephone = societe.telephone || "+212626184088";
  return [
    `${societe.raisonSociale}, Siege social : ${societe.adresse || "-"}`,
    identifiantsSociete({ societe } as CommandeDocumentData),
    `Tel : ${telephone}`,
  ]
    .filter((valeur) => valeur && valeur !== "-")
    .join(" - ");
}
