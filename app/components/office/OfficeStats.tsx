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
}

const ITEMS: Array<{ key: keyof OfficeStatsProps; label: string; icon: LucideIcon }> = [
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

export default function OfficeStats(props: OfficeStatsProps) {
  return (
    <section style={styles.grid}>
      {ITEMS.map((item) => (
        <div key={item.key} style={styles.card}>
          <div style={styles.iconWrap}>
            <item.icon size={18} strokeWidth={2.2} />
          </div>
          <p style={styles.label}>{item.label}</p>
          <strong style={styles.value}>{props[item.key]}</strong>
        </div>
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
    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.07)",
    display: "grid",
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    color: "#1d4ed8",
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
    color: "#0f172a",
    fontSize: 26,
    fontWeight: 800,
  },
};
