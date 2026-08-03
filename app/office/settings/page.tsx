"use client";

import type { CSSProperties } from "react";

export default function OfficeSettingsPage() {
  return (
    <div style={styles.page}>
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Administration</p>
          <h2 style={styles.title}>Office Settings</h2>
          <p style={styles.subtitle}>Configure company profile, departments, office locations, permissions, notifications, backups, and audit rules.</p>
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}><h3 style={styles.cardTitle}>Company Profile</h3><p style={styles.text}>Branding, contact details, and office operating policies.</p></article>
        <article style={styles.card}><h3 style={styles.cardTitle}>Departments & Locations</h3><p style={styles.text}>Maintain the office structure used by employees and asset allocation.</p></article>
        <article style={styles.card}><h3 style={styles.cardTitle}>Roles & Permissions</h3><p style={styles.text}>Control access to assets, tickets, reports, and admin functions.</p></article>
        <article style={styles.card}><h3 style={styles.cardTitle}>Backup & Audit</h3><p style={styles.text}>Schedule backups, notification rules, and audit retention policies.</p></article>
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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 },
  card: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  text: { margin: "10px 0 0", color: "#64748b", lineHeight: 1.6 },
};
