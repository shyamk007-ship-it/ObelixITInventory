import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRightLeft, CalendarClock, Package, Ticket, TriangleAlert, Users, Wrench, BadgeCheck, type LucideIcon } from "lucide-react";

interface OfficeStatsProps {
  totalOfficeAssets: number;
  assignedAssets: number;
  availableAssets: number;
  employees: number;
  openTickets: number;
  resolvedTickets: number;
  criticalIssues: number;
  maintenanceDue: number;
  warrantyExpiring: number;
  hrefs?: Partial<Record<OfficeStatKey, string>>;
}

type OfficeStatKey =
  | "totalOfficeAssets"
  | "assignedAssets"
  | "availableAssets"
  | "employees"
  | "openTickets"
  | "resolvedTickets"
  | "criticalIssues"
  | "maintenanceDue"
  | "warrantyExpiring";

const ITEMS: Array<{ key: OfficeStatKey; label: string; icon: LucideIcon }> = [
  { key: "totalOfficeAssets", label: "Total Office Assets", icon: Package },
  { key: "assignedAssets", label: "Assigned Assets", icon: ArrowRightLeft },
  { key: "availableAssets", label: "Available Assets", icon: Package },
  { key: "employees", label: "Employees", icon: Users },
  { key: "openTickets", label: "Open Tickets", icon: Ticket },
  { key: "resolvedTickets", label: "Resolved Tickets", icon: BadgeCheck },
  { key: "criticalIssues", label: "Critical Issues", icon: TriangleAlert },
  { key: "maintenanceDue", label: "Maintenance Due", icon: Wrench },
  { key: "warrantyExpiring", label: "Warranty Expiring", icon: CalendarClock },
];

const CARD_ACCENTS: Record<OfficeStatKey, { iconBg: string; iconColor: string; valueColor: string }> = {
  totalOfficeAssets: { iconBg: "#eff6ff", iconColor: "#2563eb", valueColor: "#2563eb" },
  assignedAssets: { iconBg: "#ecfeff", iconColor: "#0ea5e9", valueColor: "#0ea5e9" },
  availableAssets: { iconBg: "#ecfdf5", iconColor: "#22c55e", valueColor: "#22c55e" },
  employees: { iconBg: "#fff7ed", iconColor: "#f59e0b", valueColor: "#f59e0b" },
  openTickets: { iconBg: "#fef2f2", iconColor: "#dc2626", valueColor: "#dc2626" },
  resolvedTickets: { iconBg: "#f0fdf4", iconColor: "#22c55e", valueColor: "#22c55e" },
  criticalIssues: { iconBg: "#fef2f2", iconColor: "#dc2626", valueColor: "#dc2626" },
  maintenanceDue: { iconBg: "#fff7ed", iconColor: "#f59e0b", valueColor: "#f59e0b" },
  warrantyExpiring: { iconBg: "#f5f3ff", iconColor: "#8b5cf6", valueColor: "#8b5cf6" },
};

export default function OfficeStats(props: OfficeStatsProps) {
  return (
    <section style={styles.grid}>
      {ITEMS.map((item) => (
        props.hrefs?.[item.key] ? (
          <Link key={item.key} href={props.hrefs[item.key] || "#"} style={styles.linkCard}>
            <div style={{ ...styles.iconWrap, background: CARD_ACCENTS[item.key].iconBg, color: CARD_ACCENTS[item.key].iconColor }}>
              <item.icon size={18} strokeWidth={2.2} />
            </div>
            <p style={styles.label}>{item.label}</p>
            <strong style={{ ...styles.value, color: CARD_ACCENTS[item.key].valueColor }}>{props[item.key]}</strong>
          </Link>
        ) : (
          <div key={item.key} style={styles.card}>
            <div style={{ ...styles.iconWrap, background: CARD_ACCENTS[item.key].iconBg, color: CARD_ACCENTS[item.key].iconColor }}>
              <item.icon size={18} strokeWidth={2.2} />
            </div>
            <p style={styles.label}>{item.label}</p>
            <strong style={{ ...styles.value, color: CARD_ACCENTS[item.key].valueColor }}>{props[item.key]}</strong>
          </div>
        )
      ))}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    display: "grid",
    gap: 8,
  },
  linkCard: {
    textDecoration: "none",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    display: "grid",
    gap: 8,
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
    cursor: "pointer",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    color: "#2563eb",
    background: "#eff6ff",
  },
  label: {
    margin: 0,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  value: {
    display: "block",
    marginTop: 2,
    fontSize: 26,
    fontWeight: 800,
  },
};
