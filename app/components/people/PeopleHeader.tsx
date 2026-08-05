import type { CSSProperties, ReactNode } from "react";

interface PeopleHeaderProps {
  title: string;
  subtitle: string;
  right?: ReactNode;
}

export default function PeopleHeader({ title, subtitle, right }: PeopleHeaderProps) {
  return (
    <div style={styles.wrap}>
      <div style={styles.left}>
        <p style={styles.eyebrow}>People</p>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
      {right ? <div style={styles.right}>{right}</div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },
  left: {
    display: "grid",
    gap: 6,
  },
  eyebrow: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: 11,
    color: "#2563eb",
    fontWeight: 800,
  },
  title: {
    margin: 0,
    fontSize: 30,
    color: "#0f172a",
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    maxWidth: 720,
    lineHeight: 1.6,
  },
  right: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
};
