import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { CommandeDocumentData } from "./document-data";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#1f2937" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, color: "#0f66d5" },
  subtitle: { marginTop: 4, color: "#6b7280" },
  box: { border: "1 solid #d1d5db", padding: 10, marginBottom: 14 },
  row: { flexDirection: "row" },
  cellHead: {
    padding: 6,
    backgroundColor: "#eef1f4",
    fontWeight: 700,
    borderBottom: "1 solid #d1d5db",
  },
  cell: { padding: 6, borderBottom: "1 solid #e5e7eb" },
  product: { width: "42%" },
  qty: { width: "18%", textAlign: "right" },
  price: { width: "20%", textAlign: "right" },
  total: { width: "20%", textAlign: "right" },
  totals: { marginLeft: "auto", width: 220, marginTop: 18 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  footer: { marginTop: 32, color: "#6b7280", fontSize: 9 },
});

export function BonLivraisonPdf({ commande }: { commande: CommandeDocumentData }) {
  return (
    <Document title={`Bon de livraison ${commande.numeroBl}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{commande.societe.raisonSociale}</Text>
            <Text style={styles.subtitle}>Bon de livraison</Text>
            {commande.societe.ice ? (
              <Text style={styles.subtitle}>ICE : {commande.societe.ice}</Text>
            ) : null}
            {commande.societe.rc ? (
              <Text style={styles.subtitle}>{commande.societe.rc}</Text>
            ) : null}
          </View>
          <View>
            <Text>{commande.numeroBl}</Text>
            <Text>{commande.date}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text>Client : {commande.client}</Text>
          <Text>Ville : {commande.ville}</Text>
          <Text>Commercial : {commande.commercial}</Text>
        </View>

        <View>
          <View style={styles.row}>
            <Text style={[styles.cellHead, styles.product]}>Produit</Text>
            <Text style={[styles.cellHead, styles.qty]}>Quantite</Text>
            <Text style={[styles.cellHead, styles.price]}>Prix unitaire</Text>
            <Text style={[styles.cellHead, styles.total]}>Net</Text>
          </View>
          {commande.lignes.map((ligne, index) => (
            <View key={`${ligne.produit}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.product]}>{ligne.produit}</Text>
              <Text style={[styles.cell, styles.qty]}>{ligne.quantite}</Text>
              <Text style={[styles.cell, styles.price]}>{ligne.prixUnitaire}</Text>
              <Text style={[styles.cell, styles.total]}>{ligne.prixNet}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text>Total</Text>
            <Text>{commande.total}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Paye</Text>
            <Text>{commande.totalPaye}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Reste</Text>
            <Text>{commande.resteDu}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Document genere depuis les prix figes de la commande. HT = TTC.
        </Text>
      </Page>
    </Document>
  );
}
