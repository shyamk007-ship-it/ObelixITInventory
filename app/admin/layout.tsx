"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { getUserProfile, canAccessAdmin, isEmployee } from "../../lib/rbac";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      if (!canAccessAdmin(profile.role)) {
        router.push(isEmployee(profile.role) ? "/employee" : "/login");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    verify();
  }, [router]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Verifying permissions...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Sidebar />
      <div style={styles.container}>
        <TopBar />
        {children}
      </div>
    </>
  );
}

const styles: any = {
  container: {
    marginLeft: 260,
    padding: 30,
    background: "#f1f5f9",
    minHeight: "100vh",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
    background: "#f8fafc",
    color: "#0f172a",
  },
};
