import Link from "next/link";

interface WorkspaceCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export default function WorkspaceCard({ icon, title, description, href, ctaLabel }: WorkspaceCardProps) {
  return (
    <article style={styles.card}>
      <p style={styles.icon}>{icon}</p>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.description}>{description}</p>
      <Link href={href} style={styles.cta}>
        {ctaLabel}
      </Link>
    </article>
  );
}

const styles: any = {
  card: {
    background: "white",
    borderRadius: 22,
    border: "1px solid #dbeafe",
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  icon: {
    margin: 0,
    fontSize: 34,
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 800,
  },
  description: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
    minHeight: 44,
  },
  cta: {
    marginTop: 8,
    display: "inline-flex",
    alignSelf: "flex-start",
    textDecoration: "none",
    color: "white",
    background: "#2563eb",
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: 13,
  },
};
