import Link from "next/link";
import type { CSSProperties } from "react";

const ACTIONS = [
  { href: "/office/assets", title: "Asset Overview", description: "Review office asset distribution and lifecycle." },
  { href: "/office/employees", title: "Employee Summary", description: "Check employee assignment and device ownership." },
  { href: "/office/tickets", title: "Support Tickets", description: "Monitor support queues and escalation status." },
  { href: "/office/network", title: "Office Network Status", description: "Track connectivity and endpoint stability." },
  { href: "/office/activity", title: "Recent Activity", description: "Audit operational changes and updates." },
  { href: "/office/maintenance", title: "Upcoming Maintenance", description: "Plan upcoming IT maintenance windows." },
  { href: "/office/assignments", title: "Quick Actions", description: "Open assignment workflows and approvals." },
];

export default function OfficeQuickActions() {
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
