"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import FleetSidebar from "../components/fleet/FleetSidebar";
import FleetHeader from "../components/fleet/FleetHeader";
import { getUserProfile } from "../lib/rbac";

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isVesselWorkspace = useMemo(() => {
    if (!pathname) return false;
    return /^\/fleet\/vessels\/[^/]+(\/|$)/.test(pathname);
  }, [pathname]);

  useEffect(() => {
    const verify = async () => {
      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      setReady(true);
    };

    void verify();
  }, [router]);

  if (!ready) {
    return (
      <div style={styles.loading}>
        <p>Preparing Fleet workspace...</p>
      </div>
    );
  }

  if (isVesselWorkspace) {
    return <>{children}</>;
  }

  return (
    <>
      <FleetSidebar />
      <main style={styles.main}>
        <FleetHeader
          title="Fleet Dashboard"
          subtitle="Monitor vessels, fleet assets, incidents, maintenance, and maritime IT operations."
        />
        {children}
      </main>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    marginLeft: 260,
    padding: 30,
    minHeight: "100vh",
    background: "#f1f5f9",
  },
  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
  },
};
