import type { CSSProperties, ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: string;
}

export default function StatCard({ title, value, hint, icon, accent = "#2563eb" }: StatCardProps) {
  return (
    <article style={styles.card}>
      <div style={styles.head}>
        <p style={styles.title}>{title}</p>
        {icon ? <span style={{ ...styles.icon, color: accent, background: `${accent}18` }}>{icon}</span> : null}
      </div>
      <strong style={styles.value}>{value}</strong>
      {hint ? <p style={styles.hint}>{hint}</p> : null}
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 14,
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
    display: "grid",
    gap: 8,
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
  },
  value: {
    color: "#0f172a",
    fontSize: 28,
    lineHeight: 1,
  },
  hint: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 12,
  },
};
