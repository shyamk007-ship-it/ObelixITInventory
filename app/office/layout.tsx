"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import OfficeSidebar from "../components/office/OfficeSidebar";
import OfficeHeader from "../components/office/OfficeHeader";
import { getUserProfile } from "../lib/rbac";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

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
        <p>Preparing Office workspace...</p>
      </div>
    );
  }

  return (
    <>
      <OfficeSidebar />
      <main style={styles.main}>
        <OfficeHeader
          title="Office Dashboard"
          subtitle="Manage office assets, employees, support tickets, and administration."
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
