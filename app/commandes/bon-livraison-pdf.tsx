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

const ROUGE = "#b11226";
const ROUGE_FONCE = "#7f0d1b";
const BLEU_TAMPON = "#173a91";
const TEXTE = "#151515";
const BORDURE = "#202020";
const FOND = "#f5f6f8";

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingHorizontal: 24,
    paddingBottom: 42,
    fontFamily: "Helvetica",
    fontSize: 8.2,
    color: TEXTE,
    backgroundColor: "#ffffff",
  },
  logoHeader: {
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  logo: {
    width: 66,
    height: 52,
    objectFit: "contain",
  },
  logoFallback: {
    width: 76,
    height: 58,
    border: `2 solid ${ROUGE}`,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: ROUGE_FONCE,
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
  },
  heroRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 5,
  },
  numberPanel: {
    flex: 1,
    border: `1 solid ${BORDURE}`,
    borderRadius: 8,
    paddingHorizontal: 18,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
  },
  numberLabel: {
    width: 145,
    fontSize: 10,
    fontWeight: 700,
  },
  numberValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  customerPanel: {
    width: 164,
    minHeight: 96,
    border: `1 solid ${BORDURE}`,
    borderRadius: 8,
    padding: 9,
  },
  customerName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    marginBottom: 8,
  },
  customerLine: {
    fontSize: 7.8,
    lineHeight: 1.35,
    marginBottom: 3,
  },
  metaTable: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  metaColumn: {
    flex: 1,
    borderRight: `1 solid ${BORDURE}`,
  },
  metaLabel: {
    minHeight: 24,
    borderBottom: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8.8,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  metaValue: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 700,
  },
  deliverySite: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
    paddingHorizontal: 15,
    gap: 18,
  },
  deliveryLabel: {
    fontSize: 9.2,
    fontWeight: 700,
  },
  deliveryValue: {
    fontSize: 9.2,
    fontWeight: 700,
  },
  productTable: {
    height: 240,
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
  },
  productHeader: {
    minHeight: 27,
    flexDirection: "row",
    backgroundColor: FOND,
  },
  productRows: {
    flex: 1,
  },
  productRow: {
    minHeight: 21,
    flexDirection: "row",
  },
  emptyProductSpace: {
    flex: 1,
    flexDirection: "row",
  },
  cell: {
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingHorizontal: 7,
    justifyContent: "center",
  },
  designation: { width: 240 },
  nombre: { width: 62, textAlign: "center" },
  poids: { width: 70, textAlign: "center" },
  prix: { width: 72, textAlign: "center" },
  total: { flex: 1, textAlign: "center" },
  headerText: {
    fontSize: 8.8,
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
  },
  productName: {
    fontWeight: 700,
  },
  summaryArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 7,
    minHeight: 72,
  },
  amountWords: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  amountWordsLabel: {
    fontSize: 8.3,
    fontWeight: 700,
    marginBottom: 8,
  },
  amountWordsValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    lineHeight: 1.4,
  },
  totalsColumn: {
    width: 145,
  },
  boxesCount: {
    height: 24,
    border: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    marginBottom: 4,
  },
  totalsBox: {
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
    borderRadius: 7,
    overflow: "hidden",
  },
  totalLine: {
    height: 22,
    flexDirection: "row",
  },
  totalLabel: {
    width: 82,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingLeft: 10,
    justifyContent: "center",
    fontWeight: 700,
  },
  totalValue: {
    flex: 1,
    borderRight: `1 solid ${BORDURE}`,
    borderBottom: `1 solid ${BORDURE}`,
    paddingRight: 8,
    justifyContent: "center",
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginTop: 3,
  },
  paymentTable: {
    width: 306,
    height: 43,
    flexDirection: "row",
    borderLeft: `1 solid ${BORDURE}`,
    borderTop: `1 solid ${BORDURE}`,
  },
  paymentColumn: {
    flex: 1,
    borderRight: `1 solid ${BORDURE}`,
  },
  paymentLabel: {
    height: 22,
    borderBottom: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 7.4,
    fontWeight: 700,
  },
  paymentValue: {
    flex: 1,
    borderBottom: `1 solid ${BORDURE}`,
  },
  netBox: {
    width: 110,
    border: `1.2 solid ${BORDURE}`,
  },
  netLabel: {
    height: 27,
    borderBottom: `1 solid ${BORDURE}`,
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  netValue: {
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 10,
  },
  conditionsBox: {
    width: 185,
    border: `1 solid ${BORDURE}`,
  },
  conditionsTitle: {
    height: 20,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 7.5,
    fontWeight: 700,
  },
  conditionsText: {
    minHeight: 36,
    padding: 5,
    fontSize: 6.6,
    lineHeight: 1.25,
  },
  stampArea: {
    width: 112,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  agreementStamp: {
    width: 76,
    height: 76,
    objectFit: "contain",
  },
  companyStamp: {
    width: 86,
    height: 86,
    objectFit: "contain",
  },
  agreementFallback: {
    width: 80,
    height: 80,
    border: `2 solid ${ROUGE}`,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  agreementFallbackText: {
    width: 62,
    color: ROUGE_FONCE,
    textAlign: "center",
    fontSize: 6.4,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  companyFallback: {
    width: 80,
    height: 80,
    border: `2 solid ${BLEU_TAMPON}`,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  companyFallbackText: {
    width: 62,
    color: BLEU_TAMPON,
    textAlign: "center",
    fontSize: 6.4,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 13,
    borderTop: `1 solid ${ROUGE}`,
    paddingTop: 5,
    alignItems: "center",
  },
  footerPrimary: {
    color: ROUGE_FONCE,
    fontSize: 6.8,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 2,
  },
  footerSecondary: {
    color: ROUGE_FONCE,
    fontSize: 6.5,
    fontWeight: 700,
    textAlign: "center",
  },
});

export function BonLivraisonPdf({ commande }: { commande: CommandeDocumentData }) {
  return (
    <Document title={`BL ${commande.numeroBl}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoHeader} fixed>
          <Logo commande={commande} />
        </View>

        <View style={styles.heroRow} wrap={false}>
          <View style={{ flex: 1 }}>
            <View style={styles.numberPanel}>
              <Text style={styles.numberLabel}>BL N° :</Text>
              <Text style={styles.numberValue}>{commande.numeroBl}</Text>
            </View>
            <View style={{ height: 5 }} />
            <View style={styles.metaTable}>
              <MetaColumn label="Date" value={commande.date} />
              <MetaColumn label="Code client" value={commande.codeClient} />
              <MetaColumn label="N° CDM client" value="-" />
            </View>
          </View>

          <View style={styles.customerPanel}>
            <Text style={styles.customerName}>{commande.client}</Text>
            <Text style={styles.customerLine}>{commande.adresseClient}</Text>
            <Text style={styles.customerLine}>{commande.ville}</Text>
            <Text style={styles.customerLine}>Commercial : {commande.commercial}</Text>
            <Text style={styles.customerLine}>ICE : -</Text>
          </View>
        </View>

        <View style={styles.deliverySite} wrap={false}>
          <Text style={styles.deliveryLabel}>Site de livraison :</Text>
          <Text style={styles.deliveryValue}>
            {commande.client} - {commande.adresseClient !== "-" ? commande.adresseClient : commande.ville}
          </Text>
        </View>

        <View style={styles.productTable}>
          <View style={styles.productHeader} fixed>
            <Text style={[styles.cell, styles.designation, styles.headerText]}>Désignation</Text>
            <Text style={[styles.cell, styles.nombre, styles.headerText]}>Nombre</Text>
            <Text style={[styles.cell, styles.poids, styles.headerText]}>Poids KG</Text>
            <Text style={[styles.cell, styles.prix, styles.headerText]}>Prix unit</Text>
            <Text style={[styles.cell, styles.total, styles.headerText]}>Total</Text>
          </View>
          <View style={styles.productRows}>
            {commande.lignes.map((ligne, index) => (
              <View key={`${ligne.produit}-${index}`} style={styles.productRow} wrap={false}>
                <Text style={[styles.cell, styles.designation, styles.productName]}>{ligne.produit}</Text>
                <Text style={[styles.cell, styles.nombre]} />
                <Text style={[styles.cell, styles.poids]}>{ligne.quantite}</Text>
                <Text style={[styles.cell, styles.prix]}>{ligne.prixUnitaire}</Text>
                <Text style={[styles.cell, styles.total]}>{ligne.prixNet}</Text>
              </View>
            ))}
            <View style={styles.emptyProductSpace}>
              <View style={[styles.cell, styles.designation]} />
              <View style={[styles.cell, styles.nombre]} />
              <View style={[styles.cell, styles.poids]} />
              <View style={[styles.cell, styles.prix]} />
              <View style={[styles.cell, styles.total]} />
            </View>
          </View>
        </View>

        <View style={styles.summaryArea} wrap={false}>
          <View style={styles.amountWords}>
            <Text style={styles.amountWordsLabel}>Arrêtée la présente livraison à la somme de :</Text>
            <Text style={styles.amountWordsValue}>{commande.montantEnLettres}</Text>
          </View>
          <View style={styles.totalsColumn}>
            <View style={styles.boxesCount}><Text>Nombre de caisses :</Text></View>
            <View style={styles.totalsBox}>
              <TotalLine label="Total HT" value={commande.totalHt} />
              <TotalLine label={`TVA ${commande.tauxTva}%`} value={commande.tva} />
              <TotalLine label="Total TTC" value={commande.totalTtc} />
            </View>
          </View>
        </View>

        <View style={styles.paymentRow} wrap={false}>
          <View style={styles.paymentTable}>
            <PaymentColumn label="Mode de règlement" />
            <PaymentColumn label="Condition de paiement" />
            <PaymentColumn label="Date d'échéance" />
          </View>
          <View style={styles.netBox}>
            <View style={styles.netLabel}><Text>NET À PAYER</Text></View>
            <View style={styles.netValue}><Text>{commande.totalTtc}</Text></View>
          </View>
        </View>

        <View style={styles.bottomRow} wrap={false}>
          <View style={styles.conditionsBox}>
            <View style={styles.conditionsTitle}><Text>CONDITIONS DE RÈGLEMENT</Text></View>
            <Text style={styles.conditionsText}>
              LOI 32-10 - 78.1/78.2/78.3{"\n"}
              CLAUSE DE RÉSERVE DE PROPRIÉTÉ{"\n"}
              APPLICABLE
            </Text>
          </View>
          <AgreementStamp commande={commande} />
          <CompanyStamp commande={commande} />
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerPrimary}>{footerPrimary(commande)}</Text>
          <Text style={styles.footerSecondary}>{footerSecondary(commande)}</Text>
        </View>
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
      <Text style={styles.logoFallbackText}>{commande.societe.raisonSociale}</Text>
    </View>
  );
}

function MetaColumn({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaColumn}>
      <View style={styles.metaLabel}><Text>{label}</Text></View>
      <View style={styles.metaValue}><Text>{value || "-"}</Text></View>
    </View>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalLine}>
      <View style={styles.totalLabel}><Text>{label}</Text></View>
      <View style={styles.totalValue}><Text>{value}</Text></View>
    </View>
  );
}

function PaymentColumn({ label }: { label: string }) {
  return (
    <View style={styles.paymentColumn}>
      <View style={styles.paymentLabel}><Text>{label}</Text></View>
      <View style={styles.paymentValue} />
    </View>
  );
}

function AgreementStamp({ commande }: { commande: CommandeDocumentData }) {
  return (
    <View style={styles.stampArea}>
      {commande.societe.tamponAgrement ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={commande.societe.tamponAgrement} style={styles.agreementStamp} />
      ) : (
        <View style={styles.agreementFallback}>
          <Text style={styles.agreementFallbackText}>
            AGRÉMENT SANITAIRE{"\n"}{commande.societe.numeroAgrement || "NON RENSEIGNÉ"}
          </Text>
        </View>
      )}
    </View>
  );
}

function CompanyStamp({ commande }: { commande: CommandeDocumentData }) {
  return (
    <View style={styles.stampArea}>
      {commande.societe.cachet ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={commande.societe.cachet} style={styles.companyStamp} />
      ) : (
        <View style={styles.companyFallback}>
          <Text style={styles.companyFallbackText}>
            {commande.societe.raisonSociale}{"\n"}
            {commande.societe.telephone || "+212 660924488"}
          </Text>
        </View>
      )}
    </View>
  );
}

function identifiantsSociete({ societe }: CommandeDocumentData): string {
  return [
    societe.rc ? `RC : ${societe.rc}` : undefined,
    societe.ice ? `ICE : ${societe.ice}` : undefined,
    societe.identifiantFiscal ? `IF : ${societe.identifiantFiscal}` : undefined,
    societe.patente ? `TP : ${societe.patente}` : undefined,
  ].filter(Boolean).join(" - ");
}

function footerPrimary({ societe }: CommandeDocumentData): string {
  return `${societe.raisonSociale}, Siège social : ${societe.adresse || "-"}`;
}

function footerSecondary({ societe }: CommandeDocumentData): string {
  const telephone = societe.telephone || "+212 660924488";
  return [identifiantsSociete({ societe } as CommandeDocumentData), `Tél : ${telephone}`]
    .filter(Boolean)
    .join(" - ");
}
