import type { CSSProperties, ReactNode } from "react";

interface InventoryStatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

export default function InventoryStatCard({ title, value, hint, icon }: InventoryStatCardProps) {
  return (
    <article style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        {icon ? <span style={styles.icon}>{icon}</span> : null}
      </div>
      <p style={styles.value}>{value}</p>
      {hint ? <p style={styles.hint}>{hint}</p> : null}
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    padding: 12,
    display: "grid",
    gap: 8,
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    margin: 0,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#334155",
    fontWeight: 800,
  },
  value: {
    margin: 0,
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  hint: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
  },
  icon: {
    color: "#2563eb",
    display: "inline-flex",
  },
};
