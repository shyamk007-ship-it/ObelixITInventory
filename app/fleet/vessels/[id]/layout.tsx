"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname, useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { buildAuditDescription, createAuditLog } from "../../../lib/audit";
import { useEnterpriseAccess } from "../../../components/shared/EnterpriseAccessProvider";
import { canAccessVesselAssignments } from "../../../lib/rbac";

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
  const router = useRouter();
  const vesselId = params?.id as string;
  const { loading: accessLoading, profile, assignments } = useEnterpriseAccess();
  const routeLogged = useRef(false);
  const loadTimerRef = useRef<number | null>(null);
  
  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVessel = useCallback(async () => {
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
  }, [vesselId]);

  useEffect(() => {
    if (accessLoading) return;

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (!vesselId || !canAccessVesselAssignments(assignments, vesselId)) {
      void createAuditLog({
        action: "Permission Denied",
        description: buildAuditDescription({
          event: "Permission Denied",
          userName: profile.full_name,
          recordType: "route",
          itemName: pathname || "/fleet/vessels/[id]",
          context: "Vessel access denied",
        }),
      });
      router.replace("/unauthorized");
      return;
    }

    if (!routeLogged.current) {
      routeLogged.current = true;
      void createAuditLog({
        action: "Route Access",
        description: buildAuditDescription({
          event: "Route Access",
          userName: profile.full_name,
          recordType: "route",
          itemName: `Vessel ${vesselId}`,
          context: pathname || `/fleet/vessels/${vesselId}`,
        }),
      });
    }

    loadTimerRef.current = window.setTimeout(() => {
      void loadVessel();
    }, 0);

    return () => {
      if (loadTimerRef.current !== null) {
        window.clearTimeout(loadTimerRef.current);
      }
    };
  }, [accessLoading, assignments, loadVessel, pathname, profile, router, vesselId]);

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
        <div style={styles.sidebarHeader}>
          <div style={styles.shipIcon}>🚢</div>
          <div>
            <h3 style={styles.vesselName}>{vessel.vessel_name}</h3>
            <p style={styles.vesselIMO}>{vessel.imo_number}</p>
          </div>
        </div>

        <div style={styles.divider} />

        <nav className="fleet-sidebar-scroll" style={styles.navScrollArea}>
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
        </nav>

        <div style={styles.divider} />

        <div style={styles.footerArea}>
          <Link href="/fleet/dashboard" style={styles.backNavButton}>
            ← Back to Fleet
          </Link>
        </div>
      </aside>

      <main style={styles.content}>{children}</main>
      <style jsx global>{`
        .fleet-sidebar-scroll,
        .fleet-main-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar,
        .fleet-main-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar-track,
        .fleet-main-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar-thumb,
        .fleet-main-scroll::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 999px;
        }

        .fleet-sidebar-scroll::-webkit-scrollbar-thumb:hover,
        .fleet-main-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
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

const styles: Record<string, CSSProperties> = {
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
    background: "#0b1220",
    width: "100%",
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
    padding: 20,
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100%",
    overflow: "hidden",
  },
  sidebarHeader: {
    flexShrink: 0,
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
    flexShrink: 0,
    height: 1,
    background: "rgba(148, 163, 184, 0.16)",
    margin: "16px 0",
  },
  navScrollArea: {
    flex: 1,
    overflowY: "auto" as const,
    overflowX: "hidden",
    minHeight: 0,
    scrollBehavior: "smooth",
    scrollbarWidth: "thin" as const,
    scrollbarColor: "#475569 transparent",
    overscrollBehavior: "contain" as const,
  },
  navItems: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
  },
  footerArea: {
    flexShrink: 0,
  },
  content: {
    marginLeft: 280,
    minHeight: "100vh",
    background: "#f8fbff",
    width: "calc(100% - 280px)",
  },
};


