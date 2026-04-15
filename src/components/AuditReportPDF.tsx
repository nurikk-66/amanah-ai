import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface Ingredient {
  name: string;
  status: "halal" | "doubtful" | "haram";
  risk: string;
  jakim: string;
  confidence: number;
  details: string;
}

export interface AuditReportData {
  scanId: string;
  timestamp: string;
  product: string;
  overallStatus: "halal" | "doubtful" | "haram";
  riskLevel: string;
  complianceScore: number;
  reason?: string;
  ingredients: Ingredient[];
}

const EMERALD = "#10b981";
const AMBER   = "#f59e0b";
const RED     = "#ef4444";
const SLATE   = "#0f172a";
const SLATE2  = "#1e293b";
const BORDER  = "#334155";
const TEXT1   = "#f1f5f9";
const TEXT2   = "#94a3b8";

const sc = (s: string) => s === "halal" ? EMERALD : s === "doubtful" ? AMBER : RED;

const s = StyleSheet.create({
  page:        { backgroundColor: SLATE, padding: 40, fontFamily: "Helvetica", color: TEXT1 },

  // header
  header:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand:       { fontSize: 20, fontFamily: "Helvetica-Bold", color: EMERALD },
  brandSub:    { fontSize: 8, color: TEXT2, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  reportTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: TEXT1 },
  reportMeta:  { fontSize: 8, color: TEXT2, marginTop: 2 },

  divider:     { borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid", marginBottom: 20 },

  secTitle:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: TEXT2, marginBottom: 10 },

  // banner
  banner:      { borderRadius: 6, padding: 14, marginBottom: 20, borderWidth: 1, borderStyle: "solid" },
  bannerLabel: { fontSize: 9, marginBottom: 4 },
  bannerProd:  { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  bannerReason:{ fontSize: 8, color: TEXT2 },

  // cards row
  cardsRow:    { flexDirection: "row", marginBottom: 20 },
  card:        { flex: 1, backgroundColor: SLATE2, borderRadius: 6, padding: 12, borderWidth: 1, borderStyle: "solid", borderColor: BORDER, marginRight: 8 },
  cardLast:    { flex: 1, backgroundColor: SLATE2, borderRadius: 6, padding: 12, borderWidth: 1, borderStyle: "solid", borderColor: BORDER },
  cardLabel:   { fontSize: 7, color: TEXT2, marginBottom: 4 },
  cardValue:   { fontSize: 16, fontFamily: "Helvetica-Bold" },
  cardSub:     { fontSize: 8, color: TEXT2, marginTop: 2 },

  // table
  tHead:       { flexDirection: "row", backgroundColor: SLATE2, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 2 },
  tRow:        { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  thText:      { fontSize: 7, fontFamily: "Helvetica-Bold", color: TEXT2 },

  c1: { flex: 2.5 },
  c2: { flex: 1 },
  c3: { flex: 1 },
  c4: { flex: 1.5 },
  c5: { flex: 0.8, textAlign: "right" },
  c6: { flex: 3, paddingLeft: 6 },

  // footer
  footer:      { position: "absolute", bottom: 28, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText:  { fontSize: 7, color: TEXT2 },
});

export function AuditReportPDF({ data }: { data: AuditReportData }) {
  const color = sc(data.overallStatus);
  const verdict =
    data.overallStatus === "halal" ? "HALAL COMPLIANT" :
    data.overallStatus === "doubtful" ? "REQUIRES REVIEW" : "NON-COMPLIANT";

  const halalCount    = data.ingredients.filter(i => i.status === "halal").length;
  const doubtfulCount = data.ingredients.filter(i => i.status === "doubtful").length;
  const haramCount    = data.ingredients.filter(i => i.status === "haram").length;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>AMANAH AI</Text>
            <Text style={s.brandSub}>Halal Compliance Intelligence Platform</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.reportTitle}>HALAL AUDIT REPORT</Text>
            <Text style={s.reportMeta}>Scan ID: {data.scanId}</Text>
            <Text style={s.reportMeta}>{data.timestamp}</Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* Verdict Banner */}
        <View style={[s.banner, { backgroundColor: `${color}18`, borderColor: `${color}50` }]}>
          <Text style={[s.bannerLabel, { color }]}>{verdict}</Text>
          <Text style={s.bannerProd}>{data.product}</Text>
          {data.reason ? <Text style={s.bannerReason}>{data.reason}</Text> : null}
        </View>

        {/* Summary Cards */}
        <Text style={s.secTitle}>SUMMARY</Text>
        <View style={s.cardsRow}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Compliance Score</Text>
            <Text style={[s.cardValue, { color }]}>{data.complianceScore}%</Text>
            <Text style={s.cardSub}>Out of 100</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Risk Level</Text>
            <Text style={[s.cardValue, { color, fontSize: 13 }]}>{data.riskLevel}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Total Ingredients</Text>
            <Text style={[s.cardValue, { color: TEXT1 }]}>{data.ingredients.length}</Text>
            <Text style={s.cardSub}>{halalCount} Halal · {doubtfulCount} Doubtful · {haramCount} Haram</Text>
          </View>
          <View style={s.cardLast}>
            <Text style={s.cardLabel}>Overall Status</Text>
            <Text style={[s.cardValue, { color, fontSize: 11 }]}>{data.overallStatus.toUpperCase()}</Text>
          </View>
        </View>

        {/* Ingredients Table */}
        <Text style={s.secTitle}>INGREDIENT ANALYSIS</Text>
        <View style={s.tHead}>
          <Text style={[s.thText, s.c1]}>Ingredient</Text>
          <Text style={[s.thText, s.c2]}>Status</Text>
          <Text style={[s.thText, s.c3]}>Risk</Text>
          <Text style={[s.thText, s.c4]}>JAKIM Code</Text>
          <Text style={[s.thText, s.c5]}>Conf.</Text>
          <Text style={[s.thText, s.c6]}>Details</Text>
        </View>
        {data.ingredients.map((ing, i) => {
          const ic = sc(ing.status);
          return (
            <View key={i} style={s.tRow}>
              <Text style={[s.c1, { fontSize: 8 }]}>{ing.name}</Text>
              <Text style={[s.c2, { fontSize: 7, fontFamily: "Helvetica-Bold", color: ic }]}>{ing.status.toUpperCase()}</Text>
              <Text style={[s.c3, { fontSize: 7, color: ic }]}>{ing.risk}</Text>
              <Text style={[s.c4, { fontSize: 7, color: TEXT2 }]}>{ing.jakim}</Text>
              <Text style={[s.c5, { fontSize: 7, color: ic }]}>{ing.confidence}%</Text>
              <Text style={[s.c6, { fontSize: 7, color: TEXT2 }]}>{ing.details}</Text>
            </View>
          );
        })}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>✓ Verified by Amanah AI · amanah-ai.com</Text>
          <Text style={s.footerText}>For compliance guidance only. Verify with JAKIM certification bodies.</Text>
        </View>

      </Page>
    </Document>
  );
}
