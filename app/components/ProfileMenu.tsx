"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Activity, Bell, Building2, ChevronDown, HelpCircle, LogOut, Settings2, Shield, Ship, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { buildAuditDescription, createAuditLog } from "../lib/audit";
import { useEnterpriseAccess } from "./shared/EnterpriseAccessProvider";
import { getWorkspaceLabel, roleLabel } from "../lib/rbac";

interface MenuAction {
  label: string;
  icon: typeof UserRound;
  handler: () => Promise<void> | void;
}

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { loading, profile, activeAssignment, assignments, switchAssignment } = useEnterpriseAccess();

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/login");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return;
      }

      if (event.target instanceof Node && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", onClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const positionDropdown = () => {
      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;
      if (!trigger || !dropdown) return;

      const triggerRect = trigger.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportPadding = 12;
      const shouldOpenAbove = triggerRect.bottom + dropdownRect.height + viewportPadding > window.innerHeight;
      setPlacement(shouldOpenAbove ? "above" : "below");
    };

    positionDropdown();
    window.addEventListener("resize", positionDropdown);
    window.addEventListener("scroll", positionDropdown, true);
    return () => {
      window.removeEventListener("resize", positionDropdown);
      window.removeEventListener("scroll", positionDropdown, true);
    };
  }, [open, assignments.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const firstItem = dropdownRef.current?.querySelector<HTMLButtonElement>("button[role='menuitem']");
    firstItem?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const closeAndNavigate = async (path: string) => {
    setOpen(false);
    triggerRef.current?.focus();
    router.push(path);
  };

  const handleLogout = async () => {
    setOpen(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await fetch("/api/office/audit/security", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "logout", context: "User signed out" }),
        });
      }
    } catch {
      // Do not block logout flow on audit failures.
    }

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
  const WorkspaceIcon = activeAssignment?.workspace === "fleet" ? Ship : Building2;

  const menuActions: MenuAction[] = [
    { label: "My Profile", icon: UserRound, handler: () => closeAndNavigate("/profile?section=profile") },
    { label: "Preferences", icon: Settings2, handler: () => closeAndNavigate("/profile?section=settings") },
    { label: "Notifications", icon: Bell, handler: () => closeAndNavigate("/profile?section=notifications") },
    { label: "Activity Log", icon: Activity, handler: () => closeAndNavigate("/profile?section=activity") },
    { label: "Security", icon: Shield, handler: () => closeAndNavigate("/profile?section=security") },
    { label: "Help Center", icon: HelpCircle, handler: () => closeAndNavigate("/office/knowledge-base") },
  ];

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      <button
        ref={triggerRef}
        type="button"
        style={styles.profileButton}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="profile-menu"
      >
        <div style={styles.avatar}>{(profile?.full_name || "U").charAt(0).toUpperCase()}</div>

        <div style={styles.userInfo}>
          <span style={styles.userLabel}>Signed in as</span>
          <span style={styles.userName}>{profile?.full_name || "User"}</span>
        </div>
        <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 140ms ease" }} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          id="profile-menu"
          role="menu"
          aria-label="Profile menu"
          style={{ ...styles.dropdown, ...(placement === "above" ? styles.dropdownAbove : styles.dropdownBelow) }}
        >
          <div style={styles.profileHeader}>
            <span style={styles.profileName}>{profile?.full_name || "User"}</span>
            <span style={styles.roleBadge}>{currentRole}</span>
            <div style={styles.workspaceSection}>
              <span style={styles.workspaceLabel}>Current Workspace</span>
              <span style={styles.workspaceBadge}>
                <WorkspaceIcon size={14} strokeWidth={2.2} />
                {currentWorkspace}
              </span>
            </div>
          </div>

          {menuActions.map((item) => (
            <button key={item.label} type="button" role="menuitem" style={styles.dropdownItem} onClick={() => void item.handler()}>
              <item.icon size={16} strokeWidth={2} aria-hidden="true" />
              {item.label}
            </button>
          ))}

          <div style={styles.switchLabel}>Switch Workspace</div>

          {assignments.map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              role="menuitem"
              style={{
                ...styles.dropdownItem,
                ...(activeAssignment?.id === assignment.id ? styles.dropdownItemActive : {}),
              }}
              onClick={() => void handleSwitch(assignment.id)}
            >
              {roleLabel[assignment.role]}
              {assignment.vessel_id ? ` - Vessel ${assignment.vessel_id}` : ""}
            </button>
          ))}

          <button type="button" role="menuitem" style={{ ...styles.dropdownItem, color: "#b91c1c" }} onClick={() => void handleLogout()}>
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
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
    zIndex: 1200,
  },
  profileButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "10px 14px",
    cursor: "pointer",
    minWidth: 180,
    justifyContent: "center",
    color: "#172033",
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
    right: 0,
    background: "white",
    borderRadius: 12,
    boxShadow: "0 18px 44px rgba(15, 23, 42, 0.16)",
    overflowY: "auto",
    overflowX: "hidden",
    maxHeight: "calc(100vh - 100px)",
    minWidth: "min(280px, calc(100vw - 24px))",
    maxWidth: "calc(100vw - 24px)",
    overscrollBehavior: "contain",
    zIndex: 999,
    border: "1px solid #e2e8f0",
  },
  dropdownBelow: {
    top: "calc(100% + 8px)",
  },
  dropdownAbove: {
    bottom: "calc(100% + 8px)",
  },
  profileHeader: {
    padding: "16px 16px 10px",
    borderBottom: "1px solid #e2e8f0",
    display: "grid",
    gap: 8,
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
    alignItems: "center",
    gap: 8,
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
  },
  workspaceSection: {
    display: "grid",
    gap: 6,
  },
  workspaceLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
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
    fontWeight: 500,
    transition: "background 0.15s ease, color 0.15s ease",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  dropdownItemActive: {
    background: "#eff6ff",
    color: "#1d4ed8",
  },
};
