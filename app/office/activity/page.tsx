"use client";

import type { CSSProperties } from "react";

const actions = ["Login", "Logout", "User Created", "User Updated", "Asset Added", "Asset Updated", "Asset Assigned", "Asset Returned", "Ticket Created", "Ticket Closed"];

export default function OfficeActivityPage() {
  return (
    <div style={styles.page}>
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Activity Logs</p>
          <h2 style={styles.title}>Operational Audit Trail</h2>
          <p style={styles.subtitle}>Track login events, asset actions, ticket workflow changes, and other office operational events.</p>
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Tracked Actions</h3>
          <div style={styles.actionList}>
            {actions.map((action) => (
              <span key={action} style={styles.badge}>{action}</span>
            ))}
          </div>
        </article>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Log Columns</h3>
          <p style={styles.text}>User, action, module, timestamp, and IP address remain the primary audit dimensions.</p>
        </article>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Retention</h3>
          <p style={styles.text}>Activity history can be filtered, exported, and retained according to office audit policy.</p>
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
  actionList: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 },
  badge: { padding: "8px 10px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 800, fontSize: 12 },
};
