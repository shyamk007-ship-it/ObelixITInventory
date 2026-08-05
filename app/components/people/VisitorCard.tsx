import type { CSSProperties } from "react";

interface VisitorCardProps {
  name: string;
  company: string;
  host: string;
  status: string;
  time: string;
}

export default function VisitorCard({ name, company, host, status, time }: VisitorCardProps) {
  const lower = status.toLowerCase();
  const statusStyle = lower.includes("blocked") ? styles.blocked : lower.includes("checked out") ? styles.out : styles.in;

  return (
    <article style={styles.card}>
      <div style={styles.head}>
        <h3 style={styles.name}>{name}</h3>
        <span style={{ ...styles.badge, ...statusStyle }}>{status}</span>
      </div>
      <p style={styles.meta}>{company || "No company"}</p>
      <p style={styles.meta}>Host: {host || "Unassigned"}</p>
      <p style={styles.time}>{time || "No time"}</p>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 12,
    display: "grid",
    gap: 6,
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  name: {
    margin: 0,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
  },
  badge: {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  in: { background: "#dcfce7", color: "#166534" },
  out: { background: "#dbeafe", color: "#1e40af" },
  blocked: { background: "#fee2e2", color: "#991b1b" },
  meta: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
  },
  time: {
    margin: 0,
    color: "#1e3a8a",
    fontSize: 12,
    fontWeight: 700,
  },
};
