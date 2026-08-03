import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

export default function OfficeAssetsPage() {
  redirect("/office/assets/register");
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={styles.kpiCard}>
      <p style={styles.kpiLabel}>{label}</p>
      <p style={styles.kpiValue}>{value}</p>
    </article>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article style={styles.chartCard}>
      <h3 style={styles.chartTitle}>{title}</h3>
      {children}
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 14 },
  hero: {
    background: "linear-gradient(120deg, #0f172a 0%, #1d4ed8 45%, #0f766e 100%)",
    borderRadius: 16,
    color: "white",
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    opacity: 0.8,
    fontWeight: 700,
  },
  title: { margin: "6px 0", fontSize: 28, fontWeight: 900 },
  subtitle: { margin: 0, maxWidth: 760, opacity: 0.92 },
  heroActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" },
  primaryButton: {
    textDecoration: "none",
    borderRadius: 10,
    background: "#22c55e",
    color: "#052e16",
    padding: "10px 14px",
    fontWeight: 800,
  },
  secondaryButton: {
    textDecoration: "none",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    padding: "10px 14px",
    fontWeight: 800,
  },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  kpiCard: { background: "white", borderRadius: 14, border: "1px solid #dbeafe", padding: 12 },
  kpiLabel: {
    margin: 0,
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: "0.06em",
  },
  kpiValue: { margin: "8px 0 0", fontSize: 24, color: "#0f172a", fontWeight: 900 },
  loading: {
    background: "white",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    color: "#334155",
    fontWeight: 700,
  },
  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 },
  chartCard: { background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12 },
  chartTitle: { margin: "0 0 8px", color: "#0f172a", fontSize: 16, fontWeight: 800 },
};
