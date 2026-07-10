import Link from "next/link";
import type { CSSProperties } from "react";

const ACTIONS = [
  { href: "/fleet/vessels", title: "Fleet Status", description: "Review vessel status and operational readiness." },
  { href: "/fleet/vessels", title: "Recent Vessel Activity", description: "Open active vessel workspaces and latest updates." },
  { href: "/fleet/maintenance", title: "Upcoming Maintenance", description: "Track preventive maintenance schedule." },
  { href: "/fleet/incidents", title: "Latest Incidents", description: "Resolve open incidents and operational alerts." },
  { href: "/fleet/network", title: "Fleet Network Health", description: "Monitor connectivity and internet posture." },
  { href: "/fleet/checklist", title: "Checklist Progress", description: "Follow IT checklist completion across vessels." },
  { href: "/fleet/documents", title: "Fleet Documents", description: "Access vessel docs and operational records." },
];

export default function FleetQuickActions() {
  return (
    <section style={styles.grid}>
      {ACTIONS.map((action) => (
        <Link key={action.href + action.title} href={action.href} style={styles.card}>
          <h3 style={styles.title}>{action.title}</h3>
          <p style={styles.text}>{action.description}</p>
        </Link>
      ))}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  card: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 18,
    textDecoration: "none",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
  },
  text: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.5,
  },
};
