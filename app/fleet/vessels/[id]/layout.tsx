"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  const router = useRouter();
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
    <div style={styles.container}>
      <div style={styles.sidebarWrapper}>
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
            <NavLink href={`/fleet/vessels/${vesselId}`} label="Overview" />
            <NavLink
              href={`/fleet/vessels/${vesselId}/assets`}
              label="Assets"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/network`}
              label="Network"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/checklist`}
              label="IT Checklist"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/maintenance`}
              label="Maintenance"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/incidents`}
              label="Incidents"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/crew`}
              label="Crew IT"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/documents`}
              label="Documents"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/reports`}
              label="Reports"
            />
            <NavLink
              href={`/fleet/vessels/${vesselId}/settings`}
              label="Settings"
            />
          </div>

          <div style={styles.divider} />

          <Link href="/fleet/dashboard">
            <button style={styles.backNavButton}>← Back to Fleet</button>
          </Link>
        </nav>
      </div>

      <div style={styles.content}>{children}</div>
    </div>
  );
}

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href}>
      <div style={styles.navItem}>{label}</div>
    </Link>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f8fbff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingContainer: {
    background: "white",
    padding: 40,
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  loadingText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  errorContainer: {
    background: "white",
    padding: 40,
    borderRadius: 20,
    border: "1px solid #fee2e2",
    textAlign: "center",
    maxWidth: 400,
  },
  errorTitle: {
    margin: "0 0 8px",
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
  },
  errorMessage: {
    margin: "0 0 24px",
    color: "#64748b",
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
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fbff",
  },
  sidebarWrapper: {
    width: 280,
    background: "white",
    borderRight: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto" as const,
  },
  sidebar: {
    padding: 20,
    display: "flex",
    flexDirection: "column" as const,
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
    color: "#0f172a",
  },
  vesselIMO: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#64748b",
    fontWeight: 500,
  },
  divider: {
    height: 1,
    background: "#e2e8f0",
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
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 500,
    transition: "background-color 0.2s",
  },
  backNavButton: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    transition: "background-color 0.2s",
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
  },
};
