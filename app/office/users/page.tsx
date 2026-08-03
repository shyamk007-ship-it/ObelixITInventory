"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

export default function OfficeUsersPage() {
  return (
    <div style={styles.page}>
      <section style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>People</p>
          <h2 style={styles.title}>Office Users</h2>
          <p style={styles.subtitle}>Manage office user accounts, permissions, and access policies.</p>
        </div>
        <Link href="/admin/users" style={styles.primaryButton}>
          Open Admin Directory
        </Link>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Roles & Permissions</h3>
          <p style={styles.text}>Control access to office modules, support operations, and administration workflows.</p>
        </article>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Office Accounts</h3>
          <p style={styles.text}>User provisioning, password policy, and assignment governance stay isolated to the Office workspace.</p>
        </article>
        <article style={styles.card}>
          <h3 style={styles.cardTitle}>Approval Workflow</h3>
          <p style={styles.text}>Link user creation and access reviews to office-specific approval checks and audit logs.</p>
        </article>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 16 },
  headerCard: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" },
  eyebrow: { margin: 0, color: "#2563eb", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" },
  title: { margin: "8px 0", color: "#0f172a", fontSize: 28, fontWeight: 900 },
  subtitle: { margin: 0, color: "#64748b", maxWidth: 760, lineHeight: 1.6 },
  primaryButton: { textDecoration: "none", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", padding: "12px 16px", borderRadius: 14, fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  card: { background: "rgba(255,255,255,0.94)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.9)", padding: 18, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  text: { margin: "10px 0 0", color: "#64748b", lineHeight: 1.6 },
};
