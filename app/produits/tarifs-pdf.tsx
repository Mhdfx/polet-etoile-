import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

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

const ROUGE = "#c90f1d";
const ROUGE_FONCE = "#99111a";
const NOIR = "#1f1f25";
const GRIS_LIGNE = "#d5d9df";

const styles = StyleSheet.create({
  page: {
    position: "relative",
    paddingTop: 34,
    paddingHorizontal: 74,
    paddingBottom: 0,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: NOIR,
    backgroundColor: "#ffffff",
  },
  watermarkLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  watermarkItem: {
    position: "absolute",
    width: 82,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.07,
  },
  watermarkBrand: {
    color: ROUGE,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
  },
  topRightShape: {
    position: "absolute",
    top: -28,
    right: -22,
    width: 154,
    height: 54,
    borderBottomLeftRadius: 50,
    backgroundColor: ROUGE,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#ffffff",
  },
  bottomLeftShape: {
    position: "absolute",
    left: -30,
    bottom: 30,
    width: 126,
    height: 50,
    borderTopRightRadius: 46,
    backgroundColor: ROUGE,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: "#ffffff",
  },
  dotPatternTop: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 56,
    height: 56,
  },
  dotPatternBottom: {
    position: "absolute",
    right: 0,
    bottom: 52,
    width: 56,
    height: 56,
  },
  header: {
    alignItems: "center",
    marginBottom: 5,
  },
  logoImage: {
    width: 105,
    height: 74,
    objectFit: "contain",
  },
  logoFallback: {
    alignItems: "center",
    width: 120,
  },
  roosterMark: {
    position: "relative",
    width: 72,
    height: 42,
    marginBottom: 1,
  },
  roosterBody: {
    position: "absolute",
    left: 24,
    top: 14,
    width: 34,
    height: 24,
    borderRadius: 18,
    backgroundColor: ROUGE,
  },
  roosterNeck: {
    position: "absolute",
    left: 35,
    top: 5,
    width: 16,
    height: 30,
    borderRadius: 12,
    backgroundColor: ROUGE_FONCE,
  },
  roosterCombA: {
    position: "absolute",
    left: 25,
    top: 0,
    width: 13,
    height: 13,
    borderRadius: 8,
    backgroundColor: ROUGE,
  },
  roosterCombB: {
    position: "absolute",
    left: 36,
    top: -2,
    width: 14,
    height: 14,
    borderRadius: 8,
    backgroundColor: ROUGE,
  },
  roosterCombC: {
    position: "absolute",
    left: 48,
    top: 2,
    width: 12,
    height: 12,
    borderRadius: 8,
    backgroundColor: ROUGE,
  },
  roosterBeak: {
    position: "absolute",
    left: 53,
    top: 14,
    width: 14,
    height: 7,
    borderRadius: 2,
    backgroundColor: "#f3a01c",
  },
  roosterEye: {
    position: "absolute",
    left: 48,
    top: 13,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: NOIR,
  },
  brandLine: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  brandBlack: {
    color: NOIR,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: -0.2,
  },
  brandRed: {
    color: ROUGE,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: -0.2,
  },
  datePill: {
    alignSelf: "center",
    marginTop: 8,
    minWidth: 166,
    borderRadius: 7,
    backgroundColor: ROUGE,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  datePillText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: 800,
    textAlign: "center",
    textTransform: "uppercase",
  },
  titleRow: {
    marginTop: 10,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  titleLine: {
    width: 78,
    height: 1,
    backgroundColor: ROUGE,
  },
  titleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ROUGE,
    marginHorizontal: 4,
  },
  title: {
    marginHorizontal: 15,
    color: NOIR,
    fontSize: 17,
    fontWeight: 900,
    letterSpacing: 1.8,
  },
  table: {
    alignSelf: "center",
    width: 442,
    borderRadius: 9,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d0d5dc",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  row: {
    flexDirection: "row",
    minHeight: 16.5,
  },
  headCell: {
    backgroundColor: ROUGE,
    color: "#ffffff",
    fontSize: 8.5,
    fontWeight: 800,
    textAlign: "center",
    paddingVertical: 5,
  },
  indexHead: {
    width: 42,
    borderRightWidth: 1,
    borderRightColor: "#f06c74",
  },
  articleHead: {
    width: 236,
    borderRightWidth: 1,
    borderRightColor: "#f06c74",
  },
  priceHead: {
    width: 164,
  },
  cell: {
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: GRIS_LIGNE,
    paddingVertical: 3,
  },
  indexCell: {
    width: 42,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#eef0f3",
  },
  indexBadge: {
    minWidth: 22,
    borderRadius: 3,
    backgroundColor: ROUGE,
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  indexText: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 7.1,
    fontWeight: 800,
  },
  articleCell: {
    width: 236,
    borderRightWidth: 1,
    borderRightColor: "#e6e9ee",
    paddingHorizontal: 15,
  },
  articleText: {
    fontSize: 7.7,
    fontWeight: 700,
  },
  priceCell: {
    width: 164,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  priceText: {
    fontSize: 7.8,
    fontWeight: 800,
  },
  noteRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  warningIcon: {
    color: ROUGE,
    fontSize: 12,
    marginRight: 8,
  },
  note: {
    fontSize: 6.5,
    fontWeight: 800,
  },
  footer: {
    width: 595,
    height: 55,
    marginTop: 25,
    marginLeft: -74,
    marginRight: -74,
    backgroundColor: ROUGE,
    color: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 82,
    paddingRight: 44,
  },
  footerBlock: {
    flexDirection: "row",
    alignItems: "center",
    width: "33.33%",
    paddingRight: 12,
  },
  footerIconWrap: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  footerIcon: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 800,
  },
  footerTitle: {
    color: "#ffffff",
    fontSize: 6.8,
    fontWeight: 800,
    marginBottom: 1,
  },
  footerText: {
    color: "#ffffff",
    fontSize: 5.8,
    lineHeight: 1.28,
  },
});

const WATERMARKS = [
  [16, 20],
  [170, 20],
  [324, 20],
  [38, 102],
  [228, 102],
  [424, 102],
  [4, 198],
  [176, 198],
  [358, 198],
  [36, 302],
  [226, 302],
  [416, 302],
  [8, 408],
  [174, 408],
  [360, 408],
  [38, 516],
  [228, 516],
  [416, 516],
] as const;

export function TarifsPdf({ data }: { data: TarifsDocumentData }) {
  return (
    <Document title={`Tarifs ${data.date}`}>
      <Page size="A4" style={styles.page}>
        <BackgroundDecor />
        <WatermarkLayer />

        <View style={styles.header}>
          {data.societe.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={data.societe.logo} style={styles.logoImage} />
          ) : (
            <LogoFallback />
          )}
        </View>

        <View style={styles.datePill}>
          <Text style={styles.datePillText}>TARIFS DU {data.date}</Text>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleLine} />
          <View style={styles.titleDot} />
          <Text style={styles.title}>LISTE DES PRIX</Text>
          <View style={styles.titleDot} />
          <View style={styles.titleLine} />
        </View>

        <View style={styles.table} wrap={false}>
          <View style={styles.row} wrap={false}>
            <Text style={[styles.headCell, styles.indexHead]}> </Text>
            <Text style={[styles.headCell, styles.articleHead]}>ARTICLE</Text>
            <Text style={[styles.headCell, styles.priceHead]}>PRIX EN KG (DH)</Text>
          </View>
          {data.produits.slice(0, 26).map((produit, index) => (
            <View key={`${produit.nom}-${index}`} style={styles.row} wrap={false}>
              <View style={[styles.cell, styles.indexCell]}>
                <View style={styles.indexBadge}>
                  <Text style={styles.indexText}>{String(index + 1).padStart(2, "0")}</Text>
                </View>
              </View>
              <View style={[styles.cell, styles.articleCell]}>
                <Text style={styles.articleText}>{produit.nom}</Text>
              </View>
              <View style={[styles.cell, styles.priceCell]}>
                <Text style={styles.priceText}>{produit.prix}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noteRow}>
          <Text style={styles.warningIcon}>!</Text>
          <Text style={styles.note}>**le tarif risque de changer pendant la semaine</Text>
        </View>

        <Footer data={data} />
      </Page>
    </Document>
  );
}

function BackgroundDecor() {
  return (
    <>
      <View style={styles.topRightShape} />
      <View style={styles.bottomLeftShape} />
      <DotPattern position="top" />
      <DotPattern position="bottom" />
    </>
  );
}

function DotPattern({ position }: { position: "top" | "bottom" }) {
  const points = Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 7 }, (__, col) => [col * 7 + 2, row * 7 + 2]),
  ).flat();

  return (
    <View style={position === "top" ? styles.dotPatternTop : styles.dotPatternBottom}>
      {points.map(([cx, cy]) => (
        <View
          key={`${cx}-${cy}`}
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            width: 1.7,
            height: 1.7,
            borderRadius: 1,
            backgroundColor: ROUGE,
            opacity: 0.65,
          }}
        />
      ))}
    </View>
  );
}

function WatermarkLayer() {
  return (
    <View style={styles.watermarkLayer}>
      {WATERMARKS.map(([left, top], index) => (
        <View key={index} style={[styles.watermarkItem, { left, top }]}>
          <Text style={styles.watermarkBrand}>COQ PLUS</Text>
        </View>
      ))}
    </View>
  );
}

function LogoFallback() {
  return (
    <View style={styles.logoFallback}>
      <View style={styles.roosterMark}>
        <View style={styles.roosterBody} />
        <View style={styles.roosterNeck} />
        <View style={styles.roosterCombA} />
        <View style={styles.roosterCombB} />
        <View style={styles.roosterCombC} />
        <View style={styles.roosterBeak} />
        <View style={styles.roosterEye} />
      </View>
      <View style={styles.brandLine}>
        <Text style={styles.brandBlack}>COQ </Text>
        <Text style={styles.brandRed}>PLUS</Text>
      </View>
    </View>
  );
}

function Footer({ data }: { data: TarifsDocumentData }) {
  const telephone = data.societe.telephone || "+212 626 18 40 88";
  const adresse = data.societe.adresse || "RDC 1 LOT EL FARAH MOHAMMEDIA";
  const ice = data.societe.ice || "-";
  const identifiantFiscal = data.societe.identifiantFiscal || "-";

  return (
    <View style={styles.footer}>
      <View style={styles.footerBlock}>
        <View style={styles.footerIconWrap}>
          <Text style={styles.footerIcon}>A</Text>
        </View>
        <View>
          <Text style={styles.footerTitle}>{data.societe.raisonSociale}</Text>
          <Text style={styles.footerText}>Siege social : {adresse}</Text>
        </View>
      </View>
      <View style={styles.footerBlock}>
        <View style={styles.footerIconWrap}>
          <Text style={styles.footerIcon}>T</Text>
        </View>
        <View>
          <Text style={styles.footerText}>{telephone}</Text>
          <Text style={styles.footerText}>coqplussarl@gmail.com</Text>
        </View>
      </View>
      <View style={styles.footerBlock}>
        <View style={styles.footerIconWrap}>
          <Text style={styles.footerIcon}>IF</Text>
        </View>
        <View>
          <Text style={styles.footerText}>ICE : {ice}</Text>
          <Text style={styles.footerText}>IF : {identifiantFiscal}</Text>
        </View>
      </View>
    </View>
  );
}
