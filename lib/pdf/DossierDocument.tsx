import "server-only";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { warrantyEndDate } from "@/lib/warranty";
import type { ClientChoice, CompletionPoint, ExtraWork, PhotoCategory, Project, WarrantyItem } from "@/types/database";
import type { DossierDrawing, DossierPhoto } from "@/lib/dossierData";

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
  rowSub: { fontSize: 8, color: "#5b5f66", marginTop: 1 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  photoBlock: { width: 150 },
  photo: { width: 150, height: 110, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 7, color: "#5b5f66", marginTop: 2 },
  signatureBox: { marginTop: 24, paddingTop: 12, borderTop: "1pt solid #dddddd" },
  signatureImg: { width: 140, height: 50, objectFit: "contain", marginTop: 6 },
  reviewBox: { marginTop: 16, paddingTop: 12, borderTop: "1pt solid #dddddd", flexDirection: "row", alignItems: "center", gap: 12 },
  reviewQr: { width: 64, height: 64 },
  reviewText: { fontSize: 9, color: "#5b5f66", maxWidth: 380 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#8a8e96", textAlign: "center" },
});

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "";

const PHOTO_STORY_LABEL: Record<"voor" | "tijdens" | "na", string> = {
  voor: "Voor de start",
  tijdens: "Tijdens de werkzaamheden",
  na: "Na afronding",
};

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      Van Essen Bouw & Onderhoud — automatisch gegenereerd opleverdossier
    </Text>
  );
}

function PhotoPage({ title, photos }: { title: string; photos: DossierPhoto[] }) {
  const withUrl = photos.filter((ph) => ph.url);
  if (withUrl.length === 0) return null;
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.photoGrid}>
        {withUrl.map((ph) => (
          <View key={ph.id} style={styles.photoBlock}>
            <Image style={styles.photo} src={ph.url as string} />
            <Text style={styles.photoCaption}>{ph.title}</Text>
          </View>
        ))}
      </View>
      <Footer />
    </Page>
  );
}

export function DossierDocument({
  project,
  clientName,
  completionPoints,
  extraWork,
  warrantyItems,
  photosByCategory,
  clientChoices,
  drawings,
  signatureUrl,
  reviewQrDataUrl,
}: {
  project: Project;
  clientName: string | null;
  completionPoints: CompletionPoint[];
  extraWork: ExtraWork[];
  warrantyItems: WarrantyItem[];
  photosByCategory: Record<PhotoCategory, DossierPhoto[]>;
  clientChoices: ClientChoice[];
  drawings: DossierDrawing[];
  signatureUrl: string | null;
  reviewQrDataUrl: string | null;
}) {
  const meerwerk = extraWork.filter((w) => w.type === "meerwerk").reduce((s, w) => s + Number(w.amount), 0);
  const minderwerk = extraWork.filter((w) => w.type === "minderwerk").reduce((s, w) => s + Number(w.amount), 0);
  const eindtotaal = Number(project.quote_amount || 0) + meerwerk - minderwerk;
  const warrantyBase = project.delivery_signed_at || project.delivery_date;
  const drawingsWithImage = drawings.filter((d) => d.fileType === "image" && d.url);
  const drawingsWithoutImage = drawings.filter((d) => !(d.fileType === "image" && d.url));

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

        {clientChoices.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Klantkeuzes</Text>
            {clientChoices.map((c) => (
              <View key={c.id} style={styles.row}>
                <View>
                  <Text>{c.category}</Text>
                  {c.description && <Text style={styles.rowSub}>{c.description}</Text>}
                </View>
                <Text>{c.choice_text || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {warrantyItems.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Garantie</Text>
            {project.warranty_text && <Text style={{ marginBottom: 6 }}>{project.warranty_text}</Text>}
            {warrantyItems.map((w) => {
              const end = warrantyEndDate(warrantyBase, w.amount, w.unit);
              return (
                <View key={w.id} style={styles.row}>
                  <Text>{w.item}</Text>
                  <View>
                    <Text>
                      {w.amount} {w.unit}
                    </Text>
                    {end && <Text style={styles.rowSub}>tot {fmtDate(end)}</Text>}
                  </View>
                </View>
              );
            })}
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

        {reviewQrDataUrl && (
          <View style={styles.reviewBox}>
            <Image style={styles.reviewQr} src={reviewQrDataUrl} />
            <Text style={styles.reviewText}>
              Bedankt voor het vertrouwen! Scan de QR-code om een review achter te laten — daar zijn we je heel dankbaar voor.
            </Text>
          </View>
        )}

        <Footer />
      </Page>

      {(["voor", "tijdens", "na"] as const).map((cat) => (
        <PhotoPage key={cat} title={PHOTO_STORY_LABEL[cat]} photos={photosByCategory[cat]} />
      ))}
      <PhotoPage title="Opleverfoto's" photos={photosByCategory.oplevering} />

      {drawings.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Tekeningen</Text>
          {drawingsWithImage.length > 0 && (
            <View style={styles.photoGrid}>
              {drawingsWithImage.map((d) => (
                <View key={d.id} style={styles.photoBlock}>
                  <Image style={styles.photo} src={d.url as string} />
                  <Text style={styles.photoCaption}>{d.title}</Text>
                </View>
              ))}
            </View>
          )}
          {drawingsWithoutImage.length > 0 && (
            <View style={{ marginTop: drawingsWithImage.length > 0 ? 12 : 0 }}>
              {drawingsWithoutImage.map((d) => (
                <View key={d.id} style={styles.row}>
                  <Text>{d.title}</Text>
                  <Text style={styles.rowSub}>bijgevoegd document</Text>
                </View>
              ))}
            </View>
          )}
          <Footer />
        </Page>
      )}
    </Document>
  );
}
