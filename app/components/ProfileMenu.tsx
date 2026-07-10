"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { buildAuditDescription, createAuditLog } from "../lib/audit";
import { useEnterpriseAccess } from "./shared/EnterpriseAccessProvider";
import { getWorkspaceLabel, roleLabel } from "../lib/rbac";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { loading, profile, activeAssignment, assignments, switchAssignment } = useEnterpriseAccess();

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    }
  }, [loading, profile, router]);

  const handleLogout = async () => {
    await createAuditLog({
      action: "Logout",
      description: buildAuditDescription({
        event: "Logout",
        userName: profile?.full_name || "Unknown User",
        recordType: "user",
        itemName: profile?.full_name || "Unknown User",
      }),
    });

    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSwitch = async (assignmentId: number) => {
    setOpen(false);
    await switchAssignment(assignmentId);
  };

  const currentRole = activeAssignment ? roleLabel[activeAssignment.role] : "Unknown";
  const currentWorkspace = activeAssignment ? getWorkspaceLabel(activeAssignment.workspace) : "Company Portal";

  return (
    <div style={styles.wrapper}>
      <button
        type="button"
        style={styles.profileButton}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div style={styles.avatar}>{(profile?.full_name || "U").charAt(0).toUpperCase()}</div>

        <div style={styles.userInfo}>
          <span style={styles.userLabel}>Signed in as</span>
          <span style={styles.userName}>{profile?.full_name || "User"}</span>
        </div>
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.profileHeader}>
            <span style={styles.profileName}>{profile?.full_name || "User"}</span>
            <span style={styles.roleBadge}>{currentRole}</span>
            <span style={styles.workspaceBadge}>{currentWorkspace}</span>
          </div>

          {assignments.length > 1 && <div style={styles.switchLabel}>Switch Workspace</div>}

          {assignments.map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              style={{
                ...styles.dropdownItem,
                ...(activeAssignment?.id === assignment.id ? styles.dropdownItemActive : {}),
              }}
              onClick={() => handleSwitch(assignment.id)}
            >
              {roleLabel[assignment.role]}{assignment.vessel_id ? ` - Vessel ${assignment.vessel_id}` : ""}
            </button>
          ))}

          <button
            type="button"
            style={{ ...styles.dropdownItem, color: "#ef4444" }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: "relative",
  },
  profileButton: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "10px 14px",
    cursor: "pointer",
    minWidth: 180,
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 0,
  },
  userLabel: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.2,
  },
  userName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 120,
  },
  dropdown: {
    position: "absolute",
    top: 70,
    right: 0,
    background: "white",
    borderRadius: 16,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    minWidth: 260,
    zIndex: 999,
    border: "1px solid #e2e8f0",
  },
  profileHeader: {
    padding: "16px 16px 8px",
    borderBottom: "1px solid #e2e8f0",
  },
  profileName: {
    display: "block",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 6,
  },
  roleBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 700,
    marginRight: 8,
    marginBottom: 8,
  },
  workspaceBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
  },
  switchLabel: {
    padding: "10px 16px 6px",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  dropdownItem: {
    width: "100%",
    textAlign: "left",
    padding: "12px 16px",
    border: "none",
    background: "white",
    cursor: "pointer",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 600,
    transition: "background 0.15s ease, color 0.15s ease",
  },
  dropdownItemActive: {
    background: "#eff6ff",
    color: "#1d4ed8",
  },
};
