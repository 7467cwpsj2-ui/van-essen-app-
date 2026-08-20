import "server-only";
import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import { warrantyEndDate } from "@/lib/warranty";
import { computeDossierFinancials } from "@/lib/dossierFinancials";
import { VAT_TYPE_LABEL, WARRANTY_TYPE_LABEL } from "@/types/database";
import type { ClientChoice, CompanyDetails, CompletionPoint, ExtraWork, PhotoCategory, Project } from "@/types/database";
import type { DossierDrawing, DossierPhoto, DossierWarrantyItem } from "@/lib/dossierData";

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

  // Voorblad
  coverPage: { padding: 0, fontFamily: "Helvetica" },
  coverImage: { width: "100%", height: 380, objectFit: "cover" },
  coverBody: { padding: 40, flexGrow: 1, justifyContent: "space-between" },
  coverBrandSub: { fontSize: 9, color: "#33a8e8", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" },
  coverEyebrow: { fontSize: 10, color: "#5b5f66", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", marginBottom: 14, lineHeight: 1.15 },
  coverMetaBox: { borderTop: "1pt solid #dddddd", paddingTop: 14, gap: 4 },
  coverMetaLine: { flexDirection: "row", gap: 8, fontSize: 10, color: "#333333" },
  coverMetaLabel: { color: "#5b5f66", width: 90 },

  // Inhoudsopgave
  tocItem: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingVertical: 7, borderBottom: "0.5pt solid #eeeeee" },
  tocNumber: { fontSize: 10, color: "#33a8e8", fontFamily: "Helvetica-Bold", width: 20 },
  tocLabel: { fontSize: 11 },

  // Garantietabel
  warrantyTableHead: {
    flexDirection: "row",
    borderBottom: "1pt solid #33a8e8",
    paddingBottom: 6,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#1c86c4",
    textTransform: "uppercase",
  },
  warrantyRow: { flexDirection: "row", paddingVertical: 7, borderBottom: "0.5pt solid #eeeeee", alignItems: "flex-start" },
  wColItem: { width: "34%" },
  wColType: { width: "20%" },
  wColManufacturer: { width: "18%" },
  wColPeriod: { width: "16%" },
  wColCert: { width: "12%" },
  pill: { fontSize: 7, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6, alignSelf: "flex-start" },
  pillEigen: { backgroundColor: "#eaf6fd", color: "#1c86c4" },
  pillFabrikant: { backgroundColor: "#fdf3e2", color: "#946a10" },

  // Contactpagina
  contactBox: { backgroundColor: "#eaf6fd", borderRadius: 6, padding: 16, marginTop: 8 },
  contactLine: { flexDirection: "row", gap: 8, fontSize: 10, marginBottom: 4 },
  contactLabel: { color: "#5b5f66", width: 90 },
});

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso)) : "";

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

function BrandMark() {
  return (
    <View>
      <View style={styles.brandRow}>
        <Text style={styles.brandVan}>VAN </Text>
        <Text style={styles.brandEssen}>ESSEN</Text>
      </View>
      <Text style={styles.brandSub}>BOUW & ONDERHOUD</Text>
    </View>
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
  coverPhotoUrl,
  company,
}: {
  project: Project;
  clientName: string | null;
  completionPoints: CompletionPoint[];
  extraWork: ExtraWork[];
  warrantyItems: DossierWarrantyItem[];
  photosByCategory: Record<PhotoCategory, DossierPhoto[]>;
  clientChoices: ClientChoice[];
  drawings: DossierDrawing[];
  signatureUrl: string | null;
  reviewQrDataUrl: string | null;
  coverPhotoUrl: string | null;
  company: CompanyDetails;
}) {
  const financials = computeDossierFinancials(project, extraWork);
  const warrantyBase = project.delivery_signed_at || project.delivery_date;
  const drawingsWithImage = drawings.filter((d) => d.fileType === "image" && d.url);
  const drawingsWithoutImage = drawings.filter((d) => !(d.fileType === "image" && d.url));
  const hasPhotoPages =
    photosByCategory.voor.some((p) => p.url) ||
    photosByCategory.tijdens.some((p) => p.url) ||
    photosByCategory.na.some((p) => p.url) ||
    photosByCategory.oplevering.some((p) => p.url);

  const toc = [
    "Financieel overzicht, opleverpunten & klantkeuzes",
    warrantyItems.length > 0 ? "Materialen & garantie" : null,
    hasPhotoPages ? "Foto's van het project" : null,
    drawings.length > 0 ? "Tekeningen" : null,
    "Contact & vervolgstappen",
    "Ondertekening",
  ].filter((t): t is string => !!t);

  return (
    <Document title={`Opleverdossier — ${project.name}`}>
      {/* Voorblad */}
      <Page size="A4" style={styles.coverPage}>
        {coverPhotoUrl && <Image style={styles.coverImage} src={coverPhotoUrl} />}
        <View style={styles.coverBody}>
          <View>
            <BrandMark />
            <Text style={styles.coverEyebrow}>{"\n"}Opleverdossier</Text>
            <Text style={styles.coverTitle}>{project.name}</Text>
          </View>
          <View style={styles.coverMetaBox}>
            {project.address && (
              <View style={styles.coverMetaLine}>
                <Text style={styles.coverMetaLabel}>Adres</Text>
                <Text>{project.address}</Text>
              </View>
            )}
            {clientName && (
              <View style={styles.coverMetaLine}>
                <Text style={styles.coverMetaLabel}>Klant</Text>
                <Text>{clientName}</Text>
              </View>
            )}
            <View style={styles.coverMetaLine}>
              <Text style={styles.coverMetaLabel}>Datum</Text>
              <Text>{fmtDate(project.delivery_signed_at || project.delivery_date) || "—"}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Inhoudsopgave */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <BrandMark />
          <Text style={styles.docTitle}>Opleverdossier{"\n"}{project.name}</Text>
        </View>
        <Text style={styles.sectionTitle}>In dit dossier</Text>
        {toc.map((label, i) => (
          <View key={label} style={styles.tocItem}>
            <Text style={styles.tocNumber}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={styles.tocLabel}>{label}</Text>
          </View>
        ))}
        <Footer />
      </Page>

      {/* Financieel, opleverpunten, klantkeuzes */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <BrandMark />
          <Text style={styles.docTitle}>Opleverdossier{"\n"}{project.name}</Text>
        </View>

        <Text style={styles.sectionTitle}>Financieel overzicht</Text>
        {financials.map((f) => (
          <View key={f.vatType} style={[styles.summaryBox, { marginBottom: 8 }]}>
            {f.isQuoteVatType && (
              <View style={styles.summaryLine}>
                <Text>Offertebedrag ({VAT_TYPE_LABEL[f.vatType]})</Text>
                <Text>{fmtEuro(f.quoteAmount)}</Text>
              </View>
            )}
            {f.meerwerk > 0 && (
              <View style={styles.summaryLine}>
                <Text>Meerwerk (akkoord, {VAT_TYPE_LABEL[f.vatType]})</Text>
                <Text>{fmtEuro(f.meerwerk)}</Text>
              </View>
            )}
            {f.minderwerk > 0 && (
              <View style={styles.summaryLine}>
                <Text>Minderwerk (akkoord, {VAT_TYPE_LABEL[f.vatType]})</Text>
                <Text>− {fmtEuro(f.minderwerk)}</Text>
              </View>
            )}
            <View style={styles.summaryLineStrong}>
              <Text>Eindtotaal ({VAT_TYPE_LABEL[f.vatType]})</Text>
              <Text>{fmtEuro(f.total)}</Text>
            </View>
          </View>
        ))}

        {extraWork.length > 0 && (
          <View>
            {extraWork
              .filter((w) => w.type === "meerwerk")
              .map((w) => (
                <View key={w.id} style={styles.row}>
                  <View>
                    <Text>{w.description}</Text>
                    {w.approved_date && <Text style={styles.rowSub}>Akkoord op {fmtDate(w.approved_date)}</Text>}
                  </View>
                  <Text>{fmtEuro(w.amount)}</Text>
                </View>
              ))}
            {extraWork
              .filter((w) => w.type === "minderwerk")
              .map((w) => (
                <View key={w.id} style={styles.row}>
                  <View>
                    <Text>{w.description}</Text>
                    {w.approved_date && <Text style={styles.rowSub}>Akkoord op {fmtDate(w.approved_date)}</Text>}
                  </View>
                  <Text>− {fmtEuro(w.amount)}</Text>
                </View>
              ))}
          </View>
        )}

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
        <Footer />
      </Page>

      {/* Materialen & garantie */}
      {warrantyItems.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Materialen & garantie</Text>
          {project.warranty_text && <Text style={{ marginBottom: 10 }}>{project.warranty_text}</Text>}
          <View style={styles.warrantyTableHead}>
            <Text style={styles.wColItem}>Onderdeel</Text>
            <Text style={styles.wColType}>Type</Text>
            <Text style={styles.wColManufacturer}>Fabrikant</Text>
            <Text style={styles.wColPeriod}>Geldig tot</Text>
            <Text style={styles.wColCert}>Certificaat</Text>
          </View>
          {warrantyItems.map((w) => {
            const base = w.start_date || warrantyBase;
            const end = base ? warrantyEndDate(base, w.amount, w.unit) : null;
            return (
              <View key={w.id} style={styles.warrantyRow}>
                <Text style={styles.wColItem}>{w.item}</Text>
                <View style={styles.wColType}>
                  <Text style={[styles.pill, w.warranty_type === "fabrikant" ? styles.pillFabrikant : styles.pillEigen]}>
                    {WARRANTY_TYPE_LABEL[w.warranty_type]}
                  </Text>
                </View>
                <Text style={styles.wColManufacturer}>{w.manufacturer || "—"}</Text>
                <View style={styles.wColPeriod}>
                  <Text>{end ? fmtDate(end) : "—"}</Text>
                  <Text style={styles.rowSub}>
                    {w.amount} {w.unit}
                  </Text>
                </View>
                <View style={styles.wColCert}>
                  {w.certificateUrl ? (
                    <Link src={w.certificateUrl} style={{ fontSize: 8, color: "#1c86c4" }}>
                      Bekijken
                    </Link>
                  ) : (
                    <Text style={styles.rowSub}>—</Text>
                  )}
                </View>
              </View>
            );
          })}
          <Text style={{ ...styles.rowSub, marginTop: 14, fontSize: 8 }}>
            Op grond van artikel 7:758 lid 4 van het Burgerlijk Wetboek blijft {company.company_name} aansprakelijk voor gebreken
            die bij oplevering niet zijn ontdekt, tenzij het gebrek niet aan {company.company_name} kan worden toegerekend — dit
            geldt naast bovenstaande garantietermijnen en kan niet in het nadeel van de consument worden uitgesloten.
          </Text>
          <Footer />
        </Page>
      )}

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

      {/* Contact & vervolgstappen */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Contact & vervolgstappen</Text>
        <Text>
          Bedankt voor het vertrouwen in {company.company_name}. Dit dossier is uw persoonlijke naslagwerk: hierin vindt u alles
          terug over het uitgevoerde werk, de toegepaste materialen en de bijbehorende garanties. Het voldoet tevens aan het
          wettelijk verplichte consumentendossier zoals bedoeld in artikel 7:757a van het Burgerlijk Wetboek.
        </Text>
        <View style={styles.contactBox}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 8 }}>Vragen of een garantiekwestie?</Text>
          <View style={styles.contactLine}>
            <Text style={styles.contactLabel}>Bedrijf</Text>
            <Text>{company.company_name}</Text>
          </View>
          {company.company_address && (
            <View style={styles.contactLine}>
              <Text style={styles.contactLabel}>Adres</Text>
              <Text>
                {company.company_address}
                {company.company_postal_city ? `, ${company.company_postal_city}` : ""}
              </Text>
            </View>
          )}
          {company.company_phone && (
            <View style={styles.contactLine}>
              <Text style={styles.contactLabel}>Telefoon</Text>
              <Text>{company.company_phone}</Text>
            </View>
          )}
          {company.company_email && (
            <View style={styles.contactLine}>
              <Text style={styles.contactLabel}>E-mail</Text>
              <Text>{company.company_email}</Text>
            </View>
          )}
          {company.company_kvk && (
            <View style={styles.contactLine}>
              <Text style={styles.contactLabel}>KVK</Text>
              <Text>{company.company_kvk}</Text>
            </View>
          )}
        </View>
        <Text style={{ marginTop: 14, fontFamily: "Helvetica-Bold" }}>Een garantieclaim indienen</Text>
        <Text style={{ marginTop: 4 }}>
          Neem bij een garantiekwestie contact op via bovenstaande gegevens en vermeld het projectadres en het betreffende
          onderdeel uit de materialenlijst op de vorige pagina&apos;s. Gaat het om fabrieksgarantie, dan verwijzen wij u zo nodig
          door naar de fabrikant of leverancier.
        </Text>
        <Footer />
      </Page>

      {/* Ondertekening */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Ondertekening</Text>
        {project.delivery_signed_by ? (
          <View style={styles.signatureBox}>
            <Text>
              Ondertekend door {project.delivery_signed_by} op {fmtDate(project.delivery_signed_at)}.
            </Text>
            {signatureUrl && <Image style={styles.signatureImg} src={signatureUrl} />}
          </View>
        ) : (
          <Text>Dit dossier is nog niet ondertekend.</Text>
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
    </Document>
  );
}
