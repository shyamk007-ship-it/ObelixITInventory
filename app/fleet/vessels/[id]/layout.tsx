"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

interface Vessel {
  id: number;
  vessel_name: string;
  imo_number: string;
  status: string;
  vessel_type: string;
}

export default function VesselLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const vesselId = params?.id as string;
  
  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vesselId) return;
    void loadVessel();
  }, [vesselId]);

  const loadVessel = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("vessels")
        .select("id, vessel_name, imo_number, status, vessel_type")
        .eq("id", vesselId)
        .single();

      if (err) throw err;
      if (!data) {
        setError("Vessel not found");
        setVessel(null);
        return;
      }

      setVessel(data);
    } catch (error) {
      console.error(error);
      setError("Failed to load vessel");
      setVessel(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>Loading vessel…</p>
        </div>
      </div>
    );
  }

  if (error || !vessel) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Vessel Not Found</h2>
          <p style={styles.errorMessage}>
            {error || "The vessel you're looking for does not exist."}
          </p>
          <Link href="/fleet/dashboard">
            <button style={styles.backButton}>← Back to Fleet</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebarWrapper}>
        <nav style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <div style={styles.shipIcon}>🚢</div>
            <div>
              <h3 style={styles.vesselName}>{vessel.vessel_name}</h3>
              <p style={styles.vesselIMO}>{vessel.imo_number}</p>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.navItems}>
            <NavLink href={`/fleet/vessels/${vesselId}`} label="Overview" active={isActive(pathname, `/fleet/vessels/${vesselId}`)} />
            <NavLink
              href={`/fleet/vessels/${vesselId}/assets`}
              label="Assets"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/assets`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/network`}
              label="Network"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/network`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/checklist`}
              label="IT Checklist"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/checklist`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/maintenance`}
              label="Maintenance"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/maintenance`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/incidents`}
              label="Incidents"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/incidents`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/crew`}
              label="Crew IT"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/crew`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/documents`}
              label="Documents"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/documents`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/reports`}
              label="Reports"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/reports`)}
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/settings`}
              label="Settings"
              active={isActive(pathname, `/fleet/vessels/${vesselId}/settings`)}
            />
          </div>

          <div style={styles.divider} />

          <Link href="/fleet/dashboard">
            <button style={styles.backNavButton}>← Back to Fleet</button>
          </Link>
        </nav>
      </aside>

      <main style={styles.content}>{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <div style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}>{label}</div>
    </Link>
  );
}

function isActive(pathname: string | null, target: string) {
  if (!pathname) return false;
  return pathname === target || pathname.startsWith(`${target}/`);
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#0b1220",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingContainer: {
    background: "#111827",
    padding: 40,
    borderRadius: 20,
    border: "1px solid rgba(148, 163, 184, 0.18)",
    textAlign: "center",
  },
  loadingText: {
    color: "#60a5fa",
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  errorContainer: {
    background: "#111827",
    padding: 40,
    borderRadius: 20,
    border: "1px solid rgba(148, 163, 184, 0.18)",
    textAlign: "center",
    maxWidth: 400,
  },
  errorTitle: {
    margin: "0 0 8px",
    fontSize: 24,
    fontWeight: 800,
    color: "#f8fafc",
  },
  errorMessage: {
    margin: "0 0 24px",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  backButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  shell: {
    display: "flex",
    minHeight: "100vh",
    height: "100vh",
    background: "#0b1220",
    overflow: "hidden",
  },
  sidebarWrapper: {
    width: 280,
    flexShrink: 0,
    background: "linear-gradient(180deg, #111827 0%, #0b1220 100%)",
    borderRight: "1px solid rgba(148, 163, 184, 0.14)",
    boxShadow: "0 18px 48px rgba(2, 6, 23, 0.35)",
    position: "fixed",
    left: 0,
    top: 0,
    height: "100vh",
    overflowY: "auto" as const,
    overflowX: "hidden",
    scrollbarWidth: "thin" as const,
    scrollbarColor: "rgba(148, 163, 184, 0.45) transparent",
  },
  sidebar: {
    padding: 20,
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100%",
  },
  sidebarHeader: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  shipIcon: {
    fontSize: 32,
    marginTop: 2,
  },
  vesselName: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: "#f8fafc",
  },
  vesselIMO: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: 500,
  },
  divider: {
    height: 1,
    background: "rgba(148, 163, 184, 0.16)",
    margin: "16px 0",
  },
  navItems: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    flex: 1,
  },
  navItem: {
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 500,
    transition: "background-color 0.2s",
  },
  navItemActive: {
    background: "rgba(37, 99, 235, 0.16)",
    color: "#ffffff",
  },
  backNavButton: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(148, 163, 184, 0.08)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    transition: "background-color 0.2s",
  },
  content: {
    flex: 1,
    marginLeft: 280,
    height: "100vh",
    overflowY: "auto" as const,
    overflowX: "hidden",
    background: "#f8fbff",
    scrollbarWidth: "thin" as const,
    scrollbarColor: "rgba(100, 116, 139, 0.55) transparent",
  },
};

