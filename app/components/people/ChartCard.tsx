import type { CSSProperties, ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <article style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>
      <div style={styles.body}>{children}</div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 14,
    display: "grid",
    gap: 10,
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
  },
  header: {
    display: "grid",
    gap: 4,
  },
  title: {
    margin: 0,
    fontSize: 16,
    color: "#0f172a",
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
  },
  body: {
    minHeight: 240,
  },
};
