import Link from "next/link";
import type { CSSProperties } from "react";
import OfficeAssetModuleNav from "../../components/office/OfficeAssetModuleNav";
import { OFFICE_ANALYTICS_METRICS } from "../../lib/office-analytics";

export default function OfficeAnalyticsHomePage() {
  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Office Analytics Hub</p>
          <h2 style={styles.title}>Executive Analytics Center</h2>
          <p style={styles.subtitle}>
            Drill into assets, employees, tickets, maintenance, and warranty performance from a single live reporting entry point.
          </p>
        </div>
        <Link href="/office/dashboard" style={styles.primaryButton}>Back to Dashboard</Link>
      </section>

      <section style={styles.grid}>
        {Object.entries(OFFICE_ANALYTICS_METRICS).map(([key, metric]) => (
          <Link key={key} href={metric.path} style={styles.card}>
            <p style={styles.cardLabel}>{metric.label}</p>
            <h3 style={styles.cardTitle}>Open Analytics</h3>
            <p style={styles.cardText}>{metric.subtitle}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 16 },
  hero: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 22, borderRadius: 24, background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)", border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)" },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 11, fontWeight: 800 },
  title: { margin: "10px 0 0", color: "#0f172a", fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em" },
  subtitle: { margin: "10px 0 0", color: "#64748b", lineHeight: 1.65, maxWidth: 760 },
  primaryButton: { textDecoration: "none", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", padding: "12px 16px", borderRadius: 14, fontWeight: 800, boxShadow: "0 16px 30px rgba(37, 99, 235, 0.24)", alignSelf: "start" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 },
  card: { textDecoration: "none", background: "rgba(255,255,255,0.96)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.88)", padding: 18, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)", display: "grid", gap: 8 },
  cardLabel: { margin: 0, color: "#1d4ed8", fontSize: 11, textTransform: "uppercase", fontWeight: 900, letterSpacing: "0.1em" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  cardText: { margin: 0, color: "#64748b", lineHeight: 1.55 },
};
