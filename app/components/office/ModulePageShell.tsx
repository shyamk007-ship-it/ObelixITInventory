import Link from "next/link";
import type { CSSProperties } from "react";

interface ModulePageShellProps {
  title: string;
  description: string;
  highlights: string[];
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

export default function ModulePageShell({
  title,
  description,
  highlights,
  primaryAction,
  secondaryAction,
}: ModulePageShellProps) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.description}>{description}</p>
      </div>

      <div style={styles.actions}>
        {primaryAction ? (
          <Link href={primaryAction.href} style={{ ...styles.action, ...styles.primaryAction }}>
            {primaryAction.label}
          </Link>
        ) : null}
        {secondaryAction ? (
          <Link href={secondaryAction.href} style={styles.action}>
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>

      <div style={styles.highlights}>
        {highlights.map((item) => (
          <article key={item} style={styles.highlightCard}>
            <h2 style={styles.highlightTitle}>{item}</h2>
            <p style={styles.highlightText}>Configured in Office workspace shell and ready for role-based workflow wiring.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    borderRadius: 18,
    border: "1px solid #dbeafe",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)",
    boxShadow: "0 20px 35px rgba(15, 23, 42, 0.08)",
    padding: 20,
    display: "grid",
    gap: 16,
  },
  header: {
    display: "grid",
    gap: 8,
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 26,
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  description: {
    margin: 0,
    color: "#64748b",
    maxWidth: 900,
    lineHeight: 1.7,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  action: {
    textDecoration: "none",
    color: "#0f172a",
    borderRadius: 10,
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    fontWeight: 700,
    fontSize: 13,
  },
  primaryAction: {
    color: "white",
    border: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
  },
  highlights: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  highlightCard: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 12,
    display: "grid",
    gap: 6,
  },
  highlightTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: "#1e293b",
  },
  highlightText: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
  },
};