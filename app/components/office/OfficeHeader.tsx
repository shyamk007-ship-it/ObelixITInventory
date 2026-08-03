"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { Building2, Clock3, Database, Moon, Plus, Sun, Zap } from "lucide-react";
import NotificationBell from "../shared/NotificationBell";
import UserProfile from "../shared/UserProfile";
import SearchBar from "../shared/SearchBar";
import { supabase } from "../../lib/supabase";

interface OfficeHeaderProps {
  title: string;
  subtitle: string;
  breadcrumbs?: ReactNode;
}

const quickCreateItems = [
  { label: "Asset", href: "/office/assets/register" },
  { label: "Employee", href: "/office/employees" },
  { label: "Ticket", href: "/office/tickets" },
  { label: "Purchase Request", href: "/office/purchase-requests" },
  { label: "Vendor", href: "/office/vendors" },
  { label: "Maintenance", href: "/office/maintenance" },
  { label: "Assignment", href: "/office/assignments" },
];

export default function OfficeHeader({ title, subtitle, breadcrumbs }: OfficeHeaderProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [isDark, setIsDark] = useState(false);
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("office.theme");
    const dark = saved === "dark";
    setIsDark(dark);
    document.documentElement.setAttribute("data-office-theme", dark ? "dark" : "light");

    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const ping = async () => {
      const response = await supabase.from("assets").select("id", { head: true, count: "exact" }).limit(1);
      setDbHealthy(!response.error);
    };

    void ping();
    const timer = window.setInterval(() => {
      void ping();
    }, 45000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    window.localStorage.setItem("office.theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-office-theme", next ? "dark" : "light");
  };

  const dateLabel = useMemo(() => clock.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }), [clock]);
  const timeLabel = useMemo(() => clock.toLocaleTimeString(), [clock]);

  return (
    <header style={styles.wrap}>
      <div style={styles.topRow}>
        <div style={styles.brandRow}>
          <div style={styles.logoBadge}>
            <Building2 size={17} strokeWidth={2.3} />
          </div>
          <div>
            <p style={styles.eyebrow}>Office Operations Workspace</p>
            <h1 style={styles.title}>{title}</h1>
          </div>
        </div>

        <div style={styles.topActions}>
          <div style={styles.statusPill}>
            <Clock3 size={14} />
            <span>{dateLabel}</span>
            <strong>{timeLabel}</strong>
          </div>
          <div style={{ ...styles.statusPill, ...(dbHealthy === true ? styles.ok : dbHealthy === false ? styles.fail : {}) }}>
            <Database size={14} />
            <span>Database</span>
            <strong>{dbHealthy === null ? "Checking" : dbHealthy ? "Connected" : "Unavailable"}</strong>
          </div>
          <button type="button" style={styles.iconButton} onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      <div style={styles.breadcrumbRow}>{breadcrumbs}</div>

      <div style={styles.subtitleRow}>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>

      <div style={styles.controlRow}>
        <SearchBar placeholder="Search assets, employees, tickets, serial numbers, purchase orders, reports, maintenance, vendors..." />
        <div style={styles.controlActions}>
          <div style={styles.quickCreateWrap}>
            <button type="button" style={styles.quickCreateButton} onClick={() => setShowCreate((prev) => !prev)} aria-expanded={showCreate}>
              <Plus size={15} />
              Quick Create
            </button>
            {showCreate && (
              <div style={styles.quickCreateMenu}>
                {quickCreateItems.map((item) => (
                  <Link key={item.label} href={item.href} style={styles.quickCreateItem} onClick={() => setShowCreate(false)}>
                    <Zap size={13} />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <NotificationBell />
          <UserProfile />
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 10,
    marginBottom: 20,
    padding: 18,
    borderRadius: 22,
    background: "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(239,246,255,0.96) 100%)",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    display: "grid",
    placeItems: "center",
    color: "#1d4ed8",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    fontSize: 10,
    fontWeight: 800,
  },
  title: {
    margin: "6px 0 0",
    fontSize: 28,
    color: "#0f172a",
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  topActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #dbeafe",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
  },
  ok: {
    background: "#ecfdf5",
    borderColor: "#bbf7d0",
    color: "#166534",
  },
  fail: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#b91c1c",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid #dbeafe",
    background: "white",
    color: "#0f172a",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  breadcrumbRow: {
    display: "flex",
    alignItems: "center",
  },
  subtitleRow: {
    display: "flex",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    maxWidth: 880,
    lineHeight: 1.6,
  },
  controlRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  controlActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginLeft: "auto",
  },
  quickCreateWrap: {
    position: "relative",
  },
  quickCreateButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "white",
    padding: "11px 14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 25px rgba(37, 99, 235, 0.25)",
  },
  quickCreateMenu: {
    position: "absolute",
    top: 48,
    right: 0,
    zIndex: 1100,
    minWidth: 210,
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "white",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.14)",
    padding: 8,
    display: "grid",
    gap: 6,
  },
  quickCreateItem: {
    textDecoration: "none",
    color: "#0f172a",
    borderRadius: 8,
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
  },
};
