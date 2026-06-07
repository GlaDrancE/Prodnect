import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

export type InvoicePdfData = {
  number: string;
  issueDate: string;
  dueDate: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  workspaceName: string;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

const BRAND = "#4f46e5";
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: BRAND },
  brandSub: { fontSize: 9, color: MUTED, marginTop: 2 },
  invoiceTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "right",
  },
  invoiceMeta: { fontSize: 9, color: MUTED, textAlign: "right", marginTop: 4 },
  statusBadge: {
    marginTop: 6,
    alignSelf: "flex-end",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: BRAND,
    textTransform: "uppercase",
  },
  section: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  block: { maxWidth: 240 },
  blockLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  blockName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  blockLine: { fontSize: 9, color: MUTED, marginBottom: 1 },

  table: { marginTop: 4 },
  tHead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tHeadCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, textTransform: "uppercase" },
  tRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  cDesc: { flex: 1 },
  cQty: { width: 50, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cTotal: { width: 90, textAlign: "right" },

  totals: { marginTop: 18, alignSelf: "flex-end", width: 240 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: { color: MUTED },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 6,
    backgroundColor: BRAND,
    borderRadius: 4,
  },
  grandLabel: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 11 },
  grandValue: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 11 },

  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 10,
  },
});

function fmtMoney(n: number, currency: string) {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
  // Standard PDF fonts (Helvetica) don't include the ₹ glyph, so render INR
  // as "Rs." to avoid a missing-character box in the PDF.
  if ((currency || "INR") === "INR") return `Rs. ${amount}`;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
      n ?? 0,
    );
  } catch {
    return `${currency} ${amount}`;
  }
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const c = data.currency || "INR";
  return (
    <Document title={data.number}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{data.workspaceName}</Text>
            <Text style={styles.brandSub}>Subscription services</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>{data.number}</Text>
            <Text style={styles.invoiceMeta}>
              Issued: {fmtDate(data.issueDate)}
            </Text>
            <Text style={styles.invoiceMeta}>Due: {fmtDate(data.dueDate)}</Text>
            <Text style={styles.statusBadge}>{data.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Billed to</Text>
            <Text style={styles.blockName}>{data.client.name}</Text>
            {data.client.email ? (
              <Text style={styles.blockLine}>{data.client.email}</Text>
            ) : null}
            {data.client.phone ? (
              <Text style={styles.blockLine}>{data.client.phone}</Text>
            ) : null}
          </View>
          <View style={[styles.block, { alignItems: "flex-end" }]}>
            <Text style={styles.blockLabel}>Amount due</Text>
            <Text style={[styles.blockName, { color: BRAND, fontSize: 16 }]}>
              {fmtMoney(data.total, c)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.tHeadCell, styles.cDesc]}>Description</Text>
            <Text style={[styles.tHeadCell, styles.cQty]}>Qty</Text>
            <Text style={[styles.tHeadCell, styles.cPrice]}>Unit price</Text>
            <Text style={[styles.tHeadCell, styles.cTotal]}>Amount</Text>
          </View>
          {data.items.map((it, i) => (
            <View key={i} style={styles.tRow}>
              <Text style={styles.cDesc}>{it.description}</Text>
              <Text style={styles.cQty}>{it.quantity}</Text>
              <Text style={styles.cPrice}>{fmtMoney(it.unitPrice, c)}</Text>
              <Text style={styles.cTotal}>{fmtMoney(it.lineTotal, c)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{fmtMoney(data.subtotal, c)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text>{fmtMoney(data.tax, c)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{fmtMoney(data.total, c)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for your business. {data.workspaceName} ·{" "}
          {fmtDate(data.issueDate)}
        </Text>
      </Page>
    </Document>
  );
}
