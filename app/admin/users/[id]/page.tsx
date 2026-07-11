"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { UserManagementRecord } from "../../../lib/user-management";
import { supabase } from "../../../lib/supabase";

type UserTab = "overview" | "security" | "permissions" | "workspace" | "activity" | "devices" | "sessions" | "audit";

const tabOrder: Array<{ id: UserTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "security", label: "Security" },
  { id: "permissions", label: "Permissions" },
  { id: "workspace", label: "Workspace" },
  { id: "activity", label: "Activity" },
  { id: "devices", label: "Devices" },
  { id: "sessions", label: "Sessions" },
  { id: "audit", label: "Audit Log" },
];

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = String(params?.id || "");
  const activeTab = (searchParams.get("tab") || "overview") as UserTab;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserManagementRecord | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers = new Headers();
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }

      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { method: "GET", headers });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { success?: boolean; error?: string; data?: UserManagementRecord }) : {};

      if (!response.ok || !data.success || !data.data) {
        setError(data.error || "Unable to load user profile.");
        setLoading(false);
        return;
      }

      setUser(data.data);
      setLoading(false);
    };

    void run();
  }, [userId]);

  const assignments = useMemo(() => user?.assignments || [], [user]);

  if (loading) {
    return <div style={styles.loading}>Loading user profile...</div>;
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <p style={styles.error}>{error || "User not found."}</p>
        <Link href="/admin/users" style={styles.backLink}>Back to users</Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>User Profile</p>
          <h1 style={styles.title}>{user.full_name}</h1>
          <p style={styles.subtitle}>{user.email}</p>
        </div>
        <div style={styles.headerActions}>
          <Link href={`/admin/users/${user.auth_user_id}/security`} style={styles.primaryButton}>
            Open Security Center
          </Link>
          <button onClick={() => router.push("/admin/users")} style={styles.secondaryButton}>
            Back to Users
          </button>
        </div>
      </div>

      <div style={styles.tabBar}>
        {tabOrder.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(`/admin/users/${user.auth_user_id}?tab=${tab.id}`)}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section style={styles.card}>
        {(activeTab === "overview" || activeTab === "workspace") && (
          <div style={styles.grid2}>
            <Detail label="Role" value={user.role} />
            <Detail label="Status" value={user.is_active ? "Active" : "Disabled"} />
            <Detail label="Last Login" value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"} />
            <Detail label="Created" value={user.created_at ? new Date(user.created_at).toLocaleString() : "Unknown"} />
            <Detail label="Department" value={assignments[0]?.department || "-"} />
            <Detail label="Vessel" value={assignments[0]?.vessel_id ? `Vessel ${assignments[0].vessel_id}` : "-"} />
          </div>
        )}

        {(activeTab === "permissions" || activeTab === "workspace") && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Workspace & Permission Matrix</h3>
            <div style={styles.pillWrap}>
              {assignments.map((assignment, index) => (
                <span key={`${assignment.workspace}-${index}`} style={styles.pill}>
                  {assignment.workspace.toUpperCase()} • {assignment.role}
                  {assignment.vessel_id ? ` • Vessel ${assignment.vessel_id}` : ""}
                </span>
              ))}
              {assignments.length === 0 && <span style={styles.muted}>No assignment records.</span>}
            </div>
          </div>
        )}

        {(activeTab === "security" || activeTab === "sessions" || activeTab === "devices" || activeTab === "activity" || activeTab === "audit") && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Activity & Security</h3>
            <p style={styles.muted}>
              Detailed security actions, sessions, devices, and audit feed are available in the dedicated security center page.
            </p>
            <Link href={`/admin/users/${user.auth_user_id}/security`} style={styles.linkInline}>
              Open /admin/users/[id]/security
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailItem}>
      <p style={styles.detailLabel}>{label}</p>
      <p style={styles.detailValue}>{value}</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: 30, background: "#f1f5f9", minHeight: "100vh", display: "grid", gap: 14 },
  loading: { minHeight: "100vh", display: "grid", placeItems: "center", fontWeight: 700 },
  header: {
    background: "white",
    borderRadius: 16,
    border: "1px solid #dbeafe",
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  headerActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  eyebrow: { margin: 0, fontSize: 12, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 },
  title: { margin: "6px 0", color: "#0f172a", fontSize: 26, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b" },
  tabBar: { display: "flex", flexWrap: "wrap", gap: 8 },
  tab: { borderRadius: 999, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", padding: "8px 12px", fontWeight: 700, cursor: "pointer" },
  tabActive: { background: "#2563eb", color: "white", border: "1px solid #2563eb" },
  card: { background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 16, display: "grid", gap: 14 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  detailItem: { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" },
  detailLabel: { margin: 0, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 },
  detailValue: { margin: "6px 0 0", color: "#0f172a", fontWeight: 700 },
  section: { display: "grid", gap: 10 },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 },
  pillWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  pill: { borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", padding: "6px 10px", fontSize: 12, fontWeight: 700 },
  muted: { margin: 0, color: "#64748b" },
  error: { margin: 0, color: "#b91c1c", fontWeight: 700 },
  backLink: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  linkInline: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  primaryButton: { borderRadius: 10, border: "none", background: "#2563eb", color: "white", padding: "10px 14px", textDecoration: "none", fontWeight: 700 },
  secondaryButton: { borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
};
