"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";
import PortalHeader from "./components/PortalHeader";
import WorkspaceCard from "./components/WorkspaceCard";

export default function Home() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setReady(true);
    };

    void init();
  }, [router]);

  if (!ready) {
    return (
      <div style={styles.loadingWrap}>
        <p style={styles.loadingText}>Preparing company portal...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <PortalHeader
        eyebrow="Company Portal"
        title="IT Management Workspace Portal"
        subtitle="Select a workspace to continue with office administration or fleet operations."
      />

      <div style={styles.grid}>
        <WorkspaceCard
          icon="🏢"
          title="OFFICE OPERATIONS"
          description="Manage office assets, employees, tickets and administration."
          href="/office/dashboard"
          ctaLabel="Open Office Workspace"
        />

        <WorkspaceCard
          icon="🚢"
          title="FLEET OPERATIONS"
          description="Manage vessels, fleet assets, network and onboard IT."
          href="/fleet/dashboard"
          ctaLabel="Open Fleet Workspace"
        />
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "56px 28px",
    background: "linear-gradient(145deg, #e2e8f0 0%, #eff6ff 45%, #f8fafc 100%)",
    fontFamily: "Arial, sans-serif",
  },
  grid: {
    maxWidth: 1080,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
  },
  loadingWrap: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
  },
  loadingText: {
    color: "#0f172a",
    fontSize: 16,
  },
};
