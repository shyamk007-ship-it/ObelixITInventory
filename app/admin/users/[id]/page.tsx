"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { UserManagementRecord } from "../../../lib/user-management";
import { supabase } from "../../../lib/supabase";

type UserTab = "overview" | "security" | "permissions" | "workspace" | "activity" | "devices" | "sessions" | "audit";

interface UserDetailResponse {
  success?: boolean;
  error?: string;
  data?: UserManagementRecord;
  tabs?: {
    overview?: UserManagementRecord;
    security?: { force_password_change?: boolean; last_password_reset?: string | null; is_locked?: boolean };
    permissions?: UserManagementRecord["assignments"];
    workspace?: UserManagementRecord["assignments"];
    activity?: Array<{ id?: string | number; created_at?: string; action?: string; description?: string }>;
    devices?: Array<{ id?: string | number; assigned_date?: string; status?: string; assets?: { asset_name?: string; asset_tag?: string; category?: string } }>;
    sessions?: Array<{ id?: string | number; created_at?: string; expires_at?: string; ip_address?: string; user_agent?: string }>;
    audit_log?: Array<{ id?: string | number; created_at?: string; action?: string; description?: string }>;
    assigned_assets?: Array<{ id?: string | number; assigned_date?: string; status?: string; assets?: { asset_name?: string; asset_tag?: string; category?: string } }>;
    assigned_tickets?: Array<{ id?: string | number; title?: string; status?: string; priority?: string; category?: string; created_at?: string }>;
    login_history?: Array<{ id?: string | number; created_at?: string; action?: string; description?: string }>;
    personal_information?: {
      employee_id?: string | null;
      phone_number?: string | null;
      department?: string | null;
      designation?: string | null;
      workspace?: string | null;
      vessel_id?: number | null;
      profile_photo_url?: string | null;
    };
  };
}

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
  const [tabsData, setTabsData] = useState<UserDetailResponse["tabs"] | null>(null);

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
      const data = text ? (JSON.parse(text) as UserDetailResponse) : {};

      if (!response.ok || !data.success || !data.data) {
        setError(data.error || "Unable to load user profile.");
        setLoading(false);
        return;
      }

      setUser(data.data);
      setTabsData(data.tabs || null);
      setLoading(false);
    };

    void run();
  }, [userId]);

  const assignments = useMemo(() => user?.assignments || [], [user]);
  const personalInfo = tabsData?.personal_information;
  const assignedAssets = tabsData?.assigned_assets || [];
  const assignedTickets = tabsData?.assigned_tickets || [];
  const loginHistory = tabsData?.login_history || [];
  const activityTimeline = tabsData?.activity || [];
  const sessionRows = tabsData?.sessions || [];
  const auditRows = tabsData?.audit_log || [];

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
          <div style={styles.identityRow}>
            {user.profile_photo_url ? <img src={user.profile_photo_url} alt={user.full_name} style={styles.avatarImage} /> : <div style={styles.avatarFallback}>{user.full_name.charAt(0).toUpperCase()}</div>}
            <div style={styles.identityMeta}>
              <span style={styles.metaPill}>Employee ID: {user.employee_id || "-"}</span>
              <span style={styles.metaPill}>Designation: {user.designation || personalInfo?.designation || "-"}</span>
              <span style={styles.metaPill}>Status: {user.is_locked ? "Locked" : user.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>
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
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Personal Information</h3>
            <div style={styles.grid2}>
            <Detail label="Role" value={user.role} />
            <Detail label="Status" value={user.is_locked ? "Locked" : user.is_active ? "Active" : "Inactive"} />
            <Detail label="Employee ID" value={user.employee_id || "-"} />
            <Detail label="Phone" value={user.phone_number || personalInfo?.phone_number || "-"} />
            <Detail label="Department" value={personalInfo?.department || assignments[0]?.department || "-"} />
            <Detail label="Designation" value={user.designation || personalInfo?.designation || "-"} />
            <Detail label="Workspace" value={String(personalInfo?.workspace || assignments[0]?.workspace || "-")} />
            <Detail label="Vessel" value={personalInfo?.vessel_id ? `Vessel ${personalInfo.vessel_id}` : assignments[0]?.vessel_id ? `Vessel ${assignments[0].vessel_id}` : "-"} />
            <Detail label="Last Login" value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"} />
            <Detail label="Created" value={user.created_at ? new Date(user.created_at).toLocaleString() : "Unknown"} />
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div style={styles.grid2}>
            <InfoCard title="Assigned Assets" items={assignedAssets.map((item) => `${item.assets?.asset_name || "Asset"} • ${item.status || "Unknown"}`)} emptyMessage="No assigned assets." />
            <InfoCard title="Assigned Tickets" items={assignedTickets.map((item) => `${item.title || "Ticket"} • ${item.status || "Unknown"}`)} emptyMessage="No assigned tickets." />
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

        {activeTab === "devices" && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Assigned Assets</h3>
            <ListTable
              rows={assignedAssets.map((item) => ({
                primary: item.assets?.asset_name || "Asset",
                secondary: item.assets?.asset_tag || "-",
                meta: item.status || "Unknown",
                trailing: item.assigned_date ? new Date(item.assigned_date).toLocaleDateString() : "-",
              }))}
              emptyMessage="No assigned assets."
            />
          </div>
        )}

        {activeTab === "activity" && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Activity Timeline</h3>
            <Timeline rows={activityTimeline} emptyMessage="No recent activity recorded." />
          </div>
        )}

        {activeTab === "sessions" && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Login History & Sessions</h3>
            <Timeline rows={loginHistory.length > 0 ? loginHistory : sessionRows.map((row) => ({ created_at: row.created_at, action: "Session", description: `${row.ip_address || "Unknown IP"} • ${row.user_agent || "Unknown device"}` }))} emptyMessage="No session history recorded." />
          </div>
        )}

        {activeTab === "audit" && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Audit Log</h3>
            <Timeline rows={auditRows} emptyMessage="No audit entries found." />
          </div>
        )}

        {activeTab === "security" && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Activity & Security</h3>
            <Detail label="Force Password Change" value={tabsData?.security?.force_password_change ? "Enabled" : "Disabled"} />
            <Detail label="Last Password Reset" value={tabsData?.security?.last_password_reset ? new Date(tabsData.security.last_password_reset).toLocaleString() : "Not recorded"} />
            <Detail label="Account Lock" value={tabsData?.security?.is_locked ? "Locked" : "Unlocked"} />
            <Link href={`/admin/users/${user.auth_user_id}/security`} style={styles.linkInline}>
              Open /admin/users/[id]/security
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ title, items, emptyMessage }: { title: string; items: string[]; emptyMessage: string }) {
  return (
    <div style={styles.infoCard}>
      <h4 style={styles.infoCardTitle}>{title}</h4>
      {items.length === 0 ? <p style={styles.muted}>{emptyMessage}</p> : items.map((item) => <p key={`${title}-${item}`} style={styles.infoItem}>{item}</p>)}
    </div>
  );
}

function ListTable({
  rows,
  emptyMessage,
}: {
  rows: Array<{ primary: string; secondary: string; meta: string; trailing: string }>;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p style={styles.muted}>{emptyMessage}</p>;
  }

  return (
    <div style={styles.listTable}>
      {rows.map((row) => (
        <div key={`${row.primary}-${row.secondary}-${row.trailing}`} style={styles.listRow}>
          <div>
            <strong style={styles.listPrimary}>{row.primary}</strong>
            <p style={styles.listSecondary}>{row.secondary}</p>
          </div>
          <div style={styles.listMetaWrap}>
            <span style={styles.pill}>{row.meta}</span>
            <span style={styles.listSecondary}>{row.trailing}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({
  rows,
  emptyMessage,
}: {
  rows: Array<{ created_at?: string; action?: string; description?: string }>;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p style={styles.muted}>{emptyMessage}</p>;
  }

  return (
    <div style={styles.timeline}>
      {rows.map((row, index) => (
        <div key={`${row.created_at || "row"}-${index}`} style={styles.timelineRow}>
          <div style={styles.timelineDot} />
          <div style={styles.timelineBody}>
            <strong style={styles.listPrimary}>{row.action || "Event"}</strong>
            <p style={styles.listSecondary}>{row.description || "No description."}</p>
            <p style={styles.timelineDate}>{row.created_at ? new Date(row.created_at).toLocaleString() : "Unknown date"}</p>
          </div>
        </div>
      ))}
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
  identityRow: { marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  avatarImage: { width: 64, height: 64, borderRadius: 16, objectFit: "cover", border: "1px solid #dbeafe" },
  avatarFallback: { width: 64, height: 64, borderRadius: 16, background: "#2563eb", color: "white", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24 },
  identityMeta: { display: "flex", gap: 8, flexWrap: "wrap" },
  metaPill: { borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", padding: "6px 10px", fontSize: 12, fontWeight: 700 },
  tabBar: { display: "flex", flexWrap: "wrap", gap: 8 },
  tab: { borderRadius: 999, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", padding: "8px 12px", fontWeight: 700, cursor: "pointer" },
  tabActive: { background: "#2563eb", color: "white", border: "1px solid #2563eb" },
  card: { background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 16, display: "grid", gap: 14 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  infoCard: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" },
  infoCardTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 800 },
  infoItem: { margin: "10px 0 0", color: "#334155", fontWeight: 600 },
  detailItem: { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" },
  detailLabel: { margin: 0, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 },
  detailValue: { margin: "6px 0 0", color: "#0f172a", fontWeight: 700 },
  section: { display: "grid", gap: 10 },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 },
  pillWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  pill: { borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", padding: "6px 10px", fontSize: 12, fontWeight: 700 },
  listTable: { display: "grid", gap: 10 },
  listRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#f8fafc", flexWrap: "wrap" },
  listPrimary: { color: "#0f172a" },
  listSecondary: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  listMetaWrap: { display: "grid", gap: 6, justifyItems: "end" },
  timeline: { display: "grid", gap: 12 },
  timelineRow: { display: "grid", gridTemplateColumns: "18px 1fr", gap: 12, alignItems: "flex-start" },
  timelineDot: { width: 10, height: 10, borderRadius: "50%", background: "#2563eb", marginTop: 8 },
  timelineBody: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#f8fafc" },
  timelineDate: { margin: "8px 0 0", color: "#94a3b8", fontSize: 12 },
  muted: { margin: 0, color: "#64748b" },
  error: { margin: 0, color: "#b91c1c", fontWeight: 700 },
  backLink: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  linkInline: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  primaryButton: { borderRadius: 10, border: "none", background: "#2563eb", color: "white", padding: "10px 14px", textDecoration: "none", fontWeight: 700 },
  secondaryButton: { borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
};
