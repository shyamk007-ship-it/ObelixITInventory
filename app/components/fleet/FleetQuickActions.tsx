import Link from "next/link";
import type { CSSProperties } from "react";
import { ClipboardCheck, FileText, Ship, TriangleAlert, Wrench } from "lucide-react";

const ACTIONS = [
  { href: "/fleet/vessels", title: "Fleet Status", description: "Review vessel status and operational readiness.", icon: Ship },
  { href: "/fleet/vessels", title: "Recent Vessel Activity", description: "Open active vessel workspaces and latest updates.", icon: FileText },
  { href: "/fleet/maintenance", title: "Upcoming Maintenance", description: "Track preventive maintenance schedule.", icon: Wrench },
  { href: "/fleet/incidents", title: "Latest Incidents", description: "Resolve open incidents and operational alerts.", icon: TriangleAlert },
  { href: "/fleet/network", title: "Fleet Network Health", description: "Monitor connectivity and internet posture.", icon: Ship },
  { href: "/fleet/checklist", title: "Checklist Progress", description: "Follow IT checklist completion across vessels.", icon: ClipboardCheck },
  { href: "/fleet/documents", title: "Fleet Documents", description: "Access vessel docs and operational records.", icon: FileText },
];

export default function FleetQuickActions() {
  return (
    <section style={styles.grid}>
      {ACTIONS.map((action) => (
        <Link key={action.href + action.title} href={action.href} style={styles.card}>
          <div style={styles.iconWrap}>
            <action.icon size={18} strokeWidth={2.2} />
          </div>
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
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 18,
    textDecoration: "none",
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.07)",
    display: "grid",
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#eff6ff",
    color: "#1d4ed8",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
  },
  text: {
    margin: 0,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.5,
  },
};
