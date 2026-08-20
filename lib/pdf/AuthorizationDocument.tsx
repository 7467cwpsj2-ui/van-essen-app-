import "server-only";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { SUBSIDY_AUTHORIZATION_SCOPE_LABEL } from "@/types/database";
import type { CompanyDetails, Project, SubsidyAuthorization } from "@/types/database";

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
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#1c86c4",
  },
  line: { marginBottom: 3 },
  bodyText: { marginBottom: 10, lineHeight: 1.5 },
  noteBox: { backgroundColor: "#fdf3e2", borderRadius: 6, padding: 12, fontSize: 9, color: "#6b5320", marginTop: 8 },
  signRow: { flexDirection: "row", gap: 40, marginTop: 28 },
  signBlock: { width: "45%" },
  signLabel: { fontSize: 9, color: "#5b5f66", marginBottom: 4 },
  signBox: { borderTop: "1pt solid #cccccc", paddingTop: 6 },
  signatureImg: { width: 140, height: 50, objectFit: "contain", marginBottom: 4 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#8a8e96", textAlign: "center" },
});

const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "—";

export function AuthorizationDocument({
  project,
  clientName,
  company,
  authorization,
  signatureUrl,
}: {
  project: Project;
  clientName: string | null;
  company: CompanyDetails;
  authorization: SubsidyAuthorization;
  signatureUrl: string | null;
}) {
  return (
    <Document title={`Machtigingsformulier ISDE — ${project.name}`}>
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
            Machtigingsformulier ISDE{"\n"}
            {fmtDate(authorization.client_signed_at)}
          </Text>
        </View>

        <Text style={styles.h1}>Machtigingsformulier ISDE voor woningeigenaren</Text>

        <Text style={styles.sectionTitle}>Gegevens woningeigenaar</Text>
        <Text style={styles.line}>Naam: {clientName || "—"}</Text>
        <Text style={styles.line}>Adres woning: {project.address || "—"}</Text>

        <Text style={styles.sectionTitle}>Gegevens gemachtigde</Text>
        <Text style={styles.line}>Naam: {company.company_name}</Text>
        {company.company_kvk && <Text style={styles.line}>KVK-nummer: {company.company_kvk}</Text>}
        {company.company_address && <Text style={styles.line}>Adres: {company.company_address}</Text>}
        {company.company_postal_city && <Text style={styles.line}>Postcode en plaats: {company.company_postal_city}</Text>}
        {company.company_phone && <Text style={styles.line}>Telefoonnummer: {company.company_phone}</Text>}
        {company.company_email && <Text style={styles.line}>E-mailadres: {company.company_email}</Text>}

        <Text style={styles.sectionTitle}>Omvang van de machtiging</Text>
        <Text style={styles.bodyText}>
          Ondergetekende (de woningeigenaar) machtigt hierbij {company.company_name} om namens hem/haar{" "}
          {SUBSIDY_AUTHORIZATION_SCOPE_LABEL[authorization.scope]} bij de Rijksdienst voor Ondernemend Nederland (RVO), in het
          kader van de Investeringssubsidie duurzame energie en energiebesparing (ISDE).
        </Text>

        <View style={styles.noteBox}>
          <Text>
            Dit formulier hoeft niet te worden meegestuurd met de aanvraag bij RVO. Bewaar dit ondertekende formulier in de eigen
            administratie — RVO kan hier later om vragen.
          </Text>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signBlock}>
            <Text style={styles.signLabel}>Handtekening woningeigenaar</Text>
            <View style={styles.signBox}>
              {signatureUrl && <Image style={styles.signatureImg} src={signatureUrl} />}
              <Text>{authorization.client_signed_by || "—"}</Text>
              <Text style={styles.signLabel}>Datum: {fmtDate(authorization.client_signed_at)}</Text>
            </View>
          </View>
          <View style={styles.signBlock}>
            <Text style={styles.signLabel}>Namens gemachtigde</Text>
            <View style={styles.signBox}>
              <Text>{authorization.requested_by || company.company_name}</Text>
              <Text style={styles.signLabel}>Datum: {fmtDate(authorization.requested_at)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {company.company_name} — automatisch gegenereerd machtigingsformulier
        </Text>
      </Page>
    </Document>
  );
}
