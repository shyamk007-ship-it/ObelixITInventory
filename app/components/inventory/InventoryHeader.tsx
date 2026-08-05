import type { CSSProperties, ReactNode } from "react";

interface InventoryHeaderProps {
  title: string;
  subtitle: string;
  right?: ReactNode;
}

export default function InventoryHeader({ title, subtitle, right }: InventoryHeaderProps) {
  return (
    <header style={styles.header}>
      <div style={styles.content}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
      {right ? <div style={styles.actions}>{right}</div> : null}
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    borderRadius: 16,
    border: "1px solid #dbeafe",
    background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.98) 100%)",
    boxShadow: "0 20px 35px rgba(15, 23, 42, 0.07)",
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  content: { display: "grid", gap: 6 },
  title: {
    margin: 0,
    fontSize: 24,
    color: "#0f172a",
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    maxWidth: 820,
    lineHeight: 1.6,
  },
  actions: {
    alignSelf: "center",
  },
};
