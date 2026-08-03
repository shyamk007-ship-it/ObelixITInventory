import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRightLeft, FileText, Package, Radio, Ticket, Users, Wrench, type LucideIcon } from "lucide-react";

const ACTIONS = [
  { href: "/office/assets", title: "Asset Overview", description: "Review office asset distribution and lifecycle.", icon: Package },
  { href: "/office/employees", title: "Employee Summary", description: "Check employee assignment and device ownership.", icon: Users },
  { href: "/office/tickets", title: "Support Tickets", description: "Monitor support queues and escalation status.", icon: Ticket },
  { href: "/office/network", title: "Office Network Status", description: "Track connectivity and endpoint stability.", icon: Radio },
  { href: "/office/activity", title: "Recent Activity", description: "Audit operational changes and updates.", icon: FileText },
  { href: "/office/maintenance", title: "Upcoming Maintenance", description: "Plan upcoming IT maintenance windows.", icon: Wrench },
  { href: "/office/assignments", title: "Quick Actions", description: "Open assignment workflows and approvals.", icon: ArrowRightLeft },
];

export default function OfficeQuickActions() {
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
