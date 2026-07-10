interface PortalHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export default function PortalHeader({ eyebrow, title, subtitle }: PortalHeaderProps) {
  return (
    <header style={styles.header}>
      <p style={styles.eyebrow}>{eyebrow}</p>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.subtitle}>{subtitle}</p>
    </header>
  );
}

const styles: any = {
  header: {
    maxWidth: 980,
    margin: "0 auto 28px",
    textAlign: "center",
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#2563eb",
    fontWeight: 700,
  },
  title: {
    margin: "8px 0 10px",
    color: "#0f172a",
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.6,
  },
};
