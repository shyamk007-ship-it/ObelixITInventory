import type { CSSProperties } from "react";
import { ArrowRightLeft, ClipboardCheck, Globe, Package, Ship, TriangleAlert, Wifi, WifiOff, Wrench, type LucideIcon } from "lucide-react";

interface FleetStatsProps {
  totalVessels: number;
  onlineVessels: number;
  offlineVessels: number;
  fleetAssets: number;
  openIncidents: number;
  maintenanceDue: number;
  internetStatus: string;
  networkHealth: string;
  checklistCompletion: string;
}

const ITEMS: Array<{ key: keyof FleetStatsProps; label: string; icon: LucideIcon }> = [
  { key: "totalVessels", label: "Total Vessels", icon: Ship },
  { key: "onlineVessels", label: "Online Vessels", icon: Wifi },
  { key: "offlineVessels", label: "Offline Vessels", icon: WifiOff },
  { key: "fleetAssets", label: "Fleet Assets", icon: Package },
  { key: "openIncidents", label: "Open Incidents", icon: TriangleAlert },
  { key: "maintenanceDue", label: "Maintenance Due", icon: Wrench },
  { key: "internetStatus", label: "Internet Status", icon: Globe },
  { key: "networkHealth", label: "Network Health", icon: ArrowRightLeft },
  { key: "checklistCompletion", label: "Checklist Completion", icon: ClipboardCheck },
];

export default function FleetStats(props: FleetStatsProps) {
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
    boxShadow: "0 14px 30px rgba(15,23,42,0.07)",
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
