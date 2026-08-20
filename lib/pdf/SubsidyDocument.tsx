import "server-only";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Project, SubsidyCheckItem } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontSize: 10, fontFamily: "Helvetica", color: "#111111" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottom: "2pt solid #33a8e8",
    paddingBottom: 12,
  },
  brandRow: { flexDirection: "row" },
  brandVan: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#33a8e8" },
  brandEssen: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#111111" },
  brandSub: { fontSize: 8, color: "#33a8e8", letterSpacing: 1, marginTop: 2 },
  docTitle: { fontSize: 10, color: "#5b5f66", textAlign: "right" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4, textTransform: "uppercase" },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 20, fontSize: 9, color: "#5b5f66" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#1c86c4",
  },
  disclaimerBox: { backgroundColor: "#fdf3e2", borderRadius: 6, padding: 12, fontSize: 9, color: "#6b5320" },
  table: { marginTop: 4 },
  tableHeadRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #33a8e8",
    paddingBottom: 6,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#1c86c4",
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", paddingVertical: 6, borderBottom: "0.5pt solid #eeeeee", alignItems: "flex-start" },
  colMeasure: { width: "26%" },
  colProduct: { width: "28%" },
  colMeldcode: { width: "14%" },
  colQty: { width: "12%" },
  colDate: { width: "10%" },
  colAmount: { width: "10%", textAlign: "right" },
  rowSub: { fontSize: 7.5, color: "#5b5f66", marginTop: 1 },
  summaryBox: { backgroundColor: "#eaf6fd", borderRadius: 6, padding: 12, marginTop: 12 },
  summaryLineStrong: { flexDirection: "row", justifyContent: "space-between", fontFamily: "Helvetica-Bold", fontSize: 12 },
  summarySub: { fontSize: 8, color: "#5b5f66", marginTop: 4 },
  checklistItem: { flexDirection: "row", gap: 6, marginBottom: 4 },
  checklistBox: { width: 9, height: 9, border: "1pt solid #5b5f66", marginTop: 1 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#8a8e96", textAlign: "center" },
});

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso)) : "—";

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      Van Essen Bouw & Onderhoud — automatisch gegenereerd subsidiedocument
    </Text>
  );
}

const CHECKLIST = [
  "Factuur met daarop de RVO-meldcode en/of het aantal m² per maatregel",
  "Betaalbewijs (bv. bankafschrift) waaruit blijkt dat de factuur is voldaan",
  "Foto tijdens de uitvoering bij isolatiewerkzaamheden (huis duidelijk herkenbaar)",
  "Ondertekend machtigingsformulier als Van Essen de aanvraag namens de klant indient (zelf bewaren, hoeft niet meegestuurd)",
];

export function SubsidyDocument({
  project,
  clientName,
  items,
  totalIndicativeSubsidy,
  checkedAt,
}: {
  project: Project;
  clientName: string | null;
  items: SubsidyCheckItem[];
  totalIndicativeSubsidy: number;
  checkedAt: string;
}) {
  return (
    <Document title={`Subsidie-indicatie ISDE — ${project.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandVan}>VAN </Text>
              <Text style={styles.brandEssen}>ESSEN</Text>
            </View>
            <Text style={styles.brandSub}>BOUW & ONDERHOUD</Text>
          </View>
          <Text style={styles.docTitle}>
            Subsidie-indicatie ISDE{"\n"}
            {fmtDate(checkedAt)}
          </Text>
        </View>

        <Text style={styles.h1}>{project.name}</Text>
        <View style={styles.metaRow}>
          {project.address && <Text>{project.address}</Text>}
          {clientName && <Text>Klant: {clientName}</Text>}
        </View>

        <View style={styles.disclaimerBox}>
          <Text>
            Dit document geeft een indicatie van de ISDE-subsidie voor onderstaande maatregelen, op basis van de meldcodes en
            subsidiebedragen die Van Essen Bouw &amp; Onderhoud op {fmtDate(checkedAt)} heeft gecontroleerd (bron: RVO). De
            definitieve subsidie wordt vastgesteld door RVO na beoordeling van de aanvraag.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Maatregelen</Text>
        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={styles.colMeasure}>Maatregel</Text>
            <Text style={styles.colProduct}>Product</Text>
            <Text style={styles.colMeldcode}>Meldcode</Text>
            <Text style={styles.colQty}>Aantal</Text>
            <Text style={styles.colDate}>Uitvoering</Text>
            <Text style={styles.colAmount}>Subsidie</Text>
          </View>
          {items.map((it) => (
            <View key={it.id} style={styles.row}>
              <View style={styles.colMeasure}>
                <Text>{it.measure}</Text>
                <Text style={styles.rowSub}>{it.category}</Text>
              </View>
              <View style={styles.colProduct}>
                <Text>{it.product_name}</Text>
                {(it.manufacturer || it.type) && (
                  <Text style={styles.rowSub}>{[it.manufacturer, it.type].filter(Boolean).join(" — ")}</Text>
                )}
              </View>
              <Text style={styles.colMeldcode}>{it.meldcode || "—"}</Text>
              <Text style={styles.colQty}>
                {it.quantity} {it.unit}
              </Text>
              <Text style={styles.colDate}>{it.execution_date ? fmtDate(it.execution_date) : "—"}</Text>
              <Text style={styles.colAmount}>{fmtEuro(it.indicative_subsidy)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryLineStrong}>
            <Text>Totale indicatieve subsidie</Text>
            <Text>{fmtEuro(totalIndicativeSubsidy)}</Text>
          </View>
          <Text style={styles.summarySub}>Indicatie onder voorbehoud van goedkeuring door RVO — geen gegarandeerd bedrag.</Text>
        </View>

        <Text style={styles.sectionTitle}>Benodigd voor de aanvraag</Text>
        {CHECKLIST.map((c) => (
          <View key={c} style={styles.checklistItem}>
            <View style={styles.checklistBox} />
            <Text style={{ flex: 1 }}>{c}</Text>
          </View>
        ))}

        <Footer />
      </Page>
    </Document>
  );
}
