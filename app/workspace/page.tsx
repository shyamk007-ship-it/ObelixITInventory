"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPostLoginRoute, getUserProfile } from "../lib/rbac";

export default function WorkspaceSelectionPage() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const profile = await getUserProfile();

      if (!profile) {
        router.push("/login");
        return;
      }

      if (profile.role !== "super_admin") {
        const redirectTo = await getPostLoginRoute(profile);
        router.push(redirectTo);
        return;
      }

      setReady(true);
    };

    void verify();
  }, [router]);

  if (!ready) {
    return (
      <div style={styles.loadingWrap}>
        <p style={styles.loadingText}>Preparing workspace selection...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <p style={styles.eyebrow}>Workspace Hub</p>
        <h1 style={styles.title}>Choose Your Workspace</h1>
        <p style={styles.subtitle}>Switch between Office and Fleet modules from a single secure entry point.</p>
      </div>

      <div style={styles.grid}>
        <Link href="/office/dashboard" style={styles.card}>
          <p style={styles.icon}>🏢</p>
          <h2 style={styles.cardTitle}>Office Operations</h2>
          <p style={styles.cardText}>Manage users, assets, assignments, tickets, and office-side IT operations.</p>
        </Link>

        <Link href="/fleet/dashboard" style={styles.card}>
          <p style={styles.icon}>🚢</p>
          <h2 style={styles.cardTitle}>Fleet Operations</h2>
          <p style={styles.cardText}>Manage vessels, onboard technology health, and maritime operational IT workflows.</p>
        </Link>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: "60px 30px",
    background: "linear-gradient(150deg, #e2e8f0 0%, #eff6ff 50%, #f8fafc 100%)",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    maxWidth: 900,
    margin: "0 auto 30px",
    textAlign: "center",
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#2563eb",
    fontWeight: 700,
  },
  title: {
    margin: "8px 0 10px",
    color: "#0f172a",
    fontSize: 40,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 16,
  },
  grid: {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
  },
  card: {
    background: "white",
    borderRadius: 24,
    border: "1px solid #dbeafe",
    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
    textDecoration: "none",
    padding: 24,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  icon: {
    margin: 0,
    fontSize: 34,
  },
  cardTitle: {
    margin: "12px 0 8px",
    color: "#0f172a",
    fontSize: 24,
  },
  cardText: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
    fontSize: 14,
  },
  loadingWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
  },
  loadingText: {
    margin: 0,
    color: "#0f172a",
    fontSize: 16,
  },
};
