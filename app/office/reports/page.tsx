"use client";

import type { CSSProperties } from "react";

export default function OfficeReportsPage() {
  return (
    <div style={styles.page}>
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Reports</p>
          <h2 style={styles.title}>Office Reports</h2>
          <p style={styles.subtitle}>Generate exports for assets, employees, assignments, warranty, tickets, and maintenance.</p>
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Export Formats</h3>
          <p style={styles.text}>Support PDF, Excel, and CSV delivery for office leadership and audit workflows.</p>
        </article>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Operational Views</h3>
          <p style={styles.text}>Produce register, warranty, assignment, maintenance, and ticket summaries on demand.</p>
        </article>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Distribution</h3>
          <p style={styles.text}>Reports are tailored to office operations and exclude vessel-related data.</p>
        </article>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 16 },
  headerCard: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18 },
  eyebrow: { margin: 0, color: "#2563eb", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" },
  title: { margin: "8px 0", color: "#0f172a", fontSize: 28, fontWeight: 900 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760, lineHeight: 1.6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  card: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  text: { margin: "10px 0 0", color: "#64748b", lineHeight: 1.6 },
};
