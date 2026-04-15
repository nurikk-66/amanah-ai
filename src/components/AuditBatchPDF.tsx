import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface BatchScanItem {
  scanId: string;
  product: string;
  overallStatus: "halal" | "doubtful" | "haram";
  riskLevel: string;
  complianceScore: number;
  reason?: string;
}

export interface BatchReportData {
  batchId: string;
  timestamp: string;
  items: BatchScanItem[];
}

const EMERALD = "#10b981";
const AMBER   = "#f59e0b";
const RED     = "#ef4444";
const SLATE   = "#0f172a";
const SLATE2  = "#1e293b";
const BORDER  = "#334155";
const TEXT1   = "#f1f5f9";
const TEXT2   = "#94a3b8";
const TEXT3   = "#64748b";

const sc = (s: string) => s === "halal" ? EMERALD : s === "doubtful" ? AMBER : RED;
const sl = (s: string) => s === "halal" ? "HALAL" : s === "doubtful" ? "DOUBTFUL" : "HARAM";

const styles = StyleSheet.create({
  page:        { backgroundColor: SLATE, padding: 40, fontFamily: "Helvetica", color: TEXT1 },

  header:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  brand:       { fontSize: 20, fontFamily: "Helvetica-Bold", color: EMERALD },
  brandSub:    { fontSize: 8, color: TEXT2, marginTop: 2 },
  metaRight:   { alignItems: "flex-end" },
  metaLabel:   { fontSize: 7, color: TEXT3 },
  metaValue:   { fontSize: 9, color: TEXT2, marginTop: 1 },

  divider:     { height: 1, backgroundColor: BORDER, marginVertical: 14 },
  sectionTitle:{ fontSize: 11, fontFamily: "Helvetica-Bold", color: TEXT1, marginBottom: 10 },

  statsRow:    { flexDirection: "row", gap: 8, marginBottom: 20 },
  statBox:     { flex: 1, borderRadius: 6, padding: 10, backgroundColor: SLATE2, borderWidth: 1, borderColor: BORDER },
  statValue:   { fontSize: 20, fontFamily: "Helvetica-Bold" },
  statLabel:   { fontSize: 7, color: TEXT2, marginTop: 3 },

  tableHeader: { flexDirection: "row", backgroundColor: SLATE2, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 2 },
  tableRow:    { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 4, marginBottom: 1 },
  tableRowAlt: { backgroundColor: "#1e293b55" },
  th:          { fontSize: 7, fontFamily: "Helvetica-Bold", color: TEXT3 },
  td:          { fontSize: 9, color: TEXT1 },
  tdSm:        { fontSize: 8, color: TEXT2 },

  cNum:     { width: 24 },
  cProd:    { flex: 1, paddingRight: 6 },
  cStatus:  { width: 64 },
  cScore:   { width: 44, alignItems: "flex-end" },
  cRisk:    { width: 52, alignItems: "flex-end" },

  badge:    { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },

  footer:   { position: "absolute", bottom: 28, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerL:  { fontSize: 7, color: TEXT3 },
  footerR:  { fontSize: 7, color: EMERALD },
});

export function AuditBatchPDF({ data }: { data: BatchReportData }) {
  const total   = data.items.length;
  const avgScore = total > 0
    ? Math.round(data.items.reduce((a, i) => a + i.complianceScore, 0) / total)
    : 0;
  const halal    = data.items.filter(i => i.overallStatus === "halal").length;
  const doubtful = data.items.filter(i => i.overallStatus === "doubtful").length;
  const haram    = data.items.filter(i => i.overallStatus === "haram").length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Amanah AI</Text>
            <Text style={styles.brandSub}>Batch Compliance Report</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>BATCH ID</Text>
            <Text style={styles.metaValue}>{data.batchId}</Text>
            <Text style={[styles.metaLabel, { marginTop: 5 }]}>GENERATED</Text>
            <Text style={styles.metaValue}>{data.timestamp}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Overview Stats ── */}
        <Text style={styles.sectionTitle}>Batch Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: TEXT1 }]}>{total}</Text>
            <Text style={styles.statLabel}>Products Scanned</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: avgScore >= 80 ? EMERALD : avgScore >= 50 ? AMBER : RED }]}>
              {avgScore}
            </Text>
            <Text style={styles.statLabel}>Avg. Compliance Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: EMERALD }]}>{halal}</Text>
            <Text style={styles.statLabel}>Halal</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: AMBER }]}>{doubtful}</Text>
            <Text style={styles.statLabel}>Doubtful</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: RED }]}>{haram}</Text>
            <Text style={styles.statLabel}>Haram</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Results Table ── */}
        <Text style={styles.sectionTitle}>Scan Results</Text>

        <View style={styles.tableHeader}>
          <View style={styles.cNum}><Text style={styles.th}>#</Text></View>
          <View style={styles.cProd}><Text style={styles.th}>PRODUCT</Text></View>
          <View style={styles.cStatus}><Text style={styles.th}>STATUS</Text></View>
          <View style={styles.cScore}><Text style={styles.th}>SCORE</Text></View>
          <View style={styles.cRisk}><Text style={styles.th}>RISK</Text></View>
        </View>

        {data.items.map((item, i) => (
          <View key={item.scanId} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowAlt : {}]}>
            <View style={styles.cNum}>
              <Text style={styles.tdSm}>{i + 1}</Text>
            </View>
            <View style={styles.cProd}>
              <Text style={styles.td}>{item.product}</Text>
              <Text style={[styles.tdSm, { color: TEXT3, marginTop: 1 }]}>{item.scanId}</Text>
            </View>
            <View style={styles.cStatus}>
              <View style={[styles.badge, { backgroundColor: sc(item.overallStatus) + "25" }]}>
                <Text style={[styles.td, { color: sc(item.overallStatus), fontSize: 8 }]}>
                  {sl(item.overallStatus)}
                </Text>
              </View>
            </View>
            <View style={styles.cScore}>
              <Text style={[styles.td, { color: sc(item.overallStatus), fontFamily: "Helvetica-Bold" }]}>
                {item.complianceScore}/100
              </Text>
            </View>
            <View style={styles.cRisk}>
              <Text style={styles.tdSm}>{item.riskLevel}</Text>
            </View>
          </View>
        ))}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerL}>
            Amanah AI Batch Report · {data.batchId} · Confidential
          </Text>
          <Text style={styles.footerR}>✓ Verified by Amanah AI · amanah-ai.com</Text>
        </View>

      </Page>
    </Document>
  );
}
