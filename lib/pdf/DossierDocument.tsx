import "server-only";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { CompletionPoint, ExtraWork, Project, WarrantyItem } from "@/types/database";

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
  summaryBox: { backgroundColor: "#eaf6fd", borderRadius: 6, padding: 12 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryLineStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1pt solid #33a8e8",
    fontFamily: "Helvetica-Bold",
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "0.5pt solid #eeeeee" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  photoBlock: { width: 150 },
  photo: { width: 150, height: 110, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 7, color: "#5b5f66", marginTop: 2 },
  signatureBox: { marginTop: 24, paddingTop: 12, borderTop: "1pt solid #dddddd" },
  signatureImg: { width: 140, height: 50, objectFit: "contain", marginTop: 6 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#8a8e96", textAlign: "center" },
});

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "";

export function DossierDocument({
  project,
  clientName,
  completionPoints,
  extraWork,
  warrantyItems,
  photos,
  signatureUrl,
}: {
  project: Project;
  clientName: string | null;
  completionPoints: CompletionPoint[];
  extraWork: ExtraWork[];
  warrantyItems: WarrantyItem[];
  photos: { title: string; url: string }[];
  signatureUrl: string | null;
}) {
  const meerwerk = extraWork.filter((w) => w.type === "meerwerk").reduce((s, w) => s + Number(w.amount), 0);
  const minderwerk = extraWork.filter((w) => w.type === "minderwerk").reduce((s, w) => s + Number(w.amount), 0);
  const eindtotaal = Number(project.quote_amount || 0) + meerwerk - minderwerk;

  return (
    <Document title={`Opleverdossier — ${project.name}`}>
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
            Opleverdossier{"\n"}
            {fmtDate(project.delivery_signed_at || project.delivery_date)}
          </Text>
        </View>

        <Text style={styles.h1}>{project.name}</Text>
        <View style={styles.metaRow}>
          {project.address && <Text>{project.address}</Text>}
          {clientName && <Text>Klant: {clientName}</Text>}
        </View>

        <Text style={styles.sectionTitle}>Financieel overzicht</Text>
        <View style={styles.summaryBox}>
          <View style={styles.summaryLine}>
            <Text>Offertebedrag</Text>
            <Text>{fmtEuro(project.quote_amount)}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text>Meerwerk (akkoord)</Text>
            <Text>{fmtEuro(meerwerk)}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text>Minderwerk (akkoord)</Text>
            <Text>− {fmtEuro(minderwerk)}</Text>
          </View>
          <View style={styles.summaryLineStrong}>
            <Text>Eindtotaal</Text>
            <Text>{fmtEuro(eindtotaal)}</Text>
          </View>
        </View>

        {completionPoints.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Opleverpunten</Text>
            {completionPoints.map((p) => (
              <View key={p.id} style={styles.row}>
                <Text>{p.description}</Text>
                <Text>{p.status === "goedgekeurd" ? "Goedgekeurd" : p.status}</Text>
              </View>
            ))}
          </View>
        )}

        {warrantyItems.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Garantie</Text>
            {project.warranty_text && <Text style={{ marginBottom: 6 }}>{project.warranty_text}</Text>}
            {warrantyItems.map((w) => (
              <View key={w.id} style={styles.row}>
                <Text>{w.item}</Text>
                <Text>
                  {w.amount} {w.unit}
                </Text>
              </View>
            ))}
          </View>
        )}

        {project.delivery_signed_by && (
          <View style={styles.signatureBox}>
            <Text>
              Ondertekend door {project.delivery_signed_by} op {fmtDate(project.delivery_signed_at)}.
            </Text>
            {signatureUrl && <Image style={styles.signatureImg} src={signatureUrl} />}
          </View>
        )}

        <Text style={styles.footer} fixed>
          Van Essen Bouw & Onderhoud — automatisch gegenereerd opleverdossier
        </Text>
      </Page>

      {photos.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Opleverfoto&apos;s</Text>
          <View style={styles.photoGrid}>
            {photos.map((ph, idx) => (
              <View key={idx} style={styles.photoBlock}>
                <Image style={styles.photo} src={ph.url} />
                <Text style={styles.photoCaption}>{ph.title}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footer} fixed>
            Van Essen Bouw & Onderhoud — automatisch gegenereerd opleverdossier
          </Text>
        </Page>
      )}
    </Document>
  );
}
