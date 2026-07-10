"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  CreateUserPayload,
  RoleAssignmentInput,
  UpdateUserPayload,
  UserManagementRecord,
} from "../../lib/user-management";
import { buildAuditDescription, createAuditLog } from "../../lib/audit";
import { canManageUsers, getUserProfile, isOwnerEmail } from "../../lib/rbac";
import { supabase } from "../../lib/supabase";

const ROLE_OPTIONS: Array<{ value: RoleAssignmentInput["role"]; label: string }> = [
  { value: "super_admin", label: "Super Admin" },
  { value: "office_admin", label: "Office Admin" },
  { value: "fleet_admin", label: "Fleet Admin" },
  { value: "captain", label: "Captain" },
  { value: "chief_engineer", label: "Chief Engineer" },
  { value: "it_officer", label: "IT Officer" },
  { value: "crew_member", label: "Crew Member" },
  { value: "admin", label: "Admin" },
  { value: "it_staff", label: "IT Staff" },
  { value: "eto", label: "ETO" },
  { value: "employee", label: "Employee" },
];

const WORKSPACE_OPTIONS: Array<{ value: RoleAssignmentInput["workspace"]; label: string }> = [
  { value: "company", label: "Company" },
  { value: "office", label: "Office" },
  { value: "fleet", label: "Fleet" },
  { value: "vessel", label: "Vessel" },
];

const defaultAssignment = (): RoleAssignmentInput => ({
  role: "employee",
  workspace: "office",
  vessel_id: null,
  department: null,
  is_active: true,
});

const newUserSeed = (): CreateUserPayload => ({
  full_name: "",
  email: "",
  role: "employee",
  temporary_password: "",
  is_active: true,
  force_password_change: true,
  assignments: [defaultAssignment()],
});

export default function UsersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserManagementRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<CreateUserPayload>(newUserSeed());
  const [selectedUser, setSelectedUser] = useState<UserManagementRecord | null>(null);

  const fetchWithSession = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    return fetch(input, {
      ...init,
      headers,
    });
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await fetchWithSession("/api/admin/users", { method: "GET" });
    const json = (await response.json()) as { data?: UserManagementRecord[]; error?: string };

    if (!response.ok) {
      throw new Error(json.error || "Unable to load users.");
    }

    setUsers(json.data || []);
  }, [fetchWithSession]);

  const verifyAccess = useCallback(async () => {
    setLoading(true);
    const profile = await getUserProfile();

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (!canManageUsers(profile.role)) {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);

    try {
      await loadUsers();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [loadUsers, router]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void verifyAccess();
    }, 0);

    return () => {
      window.clearTimeout(id);
    };
  }, [verifyAccess]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !normalizedQuery ||
        user.full_name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.role.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [query, statusFilter, users]);

  const safeAssignments = (assignments: RoleAssignmentInput[]) =>
    assignments.length === 0 ? [defaultAssignment()] : assignments;

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.role) {
      setNotice("Full name, email and role are required.");
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetchWithSession("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newUser,
          assignments: safeAssignments(newUser.assignments),
        }),
      });

      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to create user.");
      }

      await createAuditLog({
        action: "Created User",
        description: buildAuditDescription({
          event: "Created User",
          userName: newUser.full_name,
          recordType: "user",
          itemName: newUser.email,
          context: `Role: ${newUser.role}`,
        }),
      });

      setNewUser(newUserSeed());
      await loadUsers();
      setNotice("User created successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const payload: UpdateUserPayload = {
        full_name: selectedUser.full_name,
        role: selectedUser.role,
        phone_number: selectedUser.phone_number,
        is_active: selectedUser.is_active,
        force_password_change: selectedUser.force_password_change,
        assignments: safeAssignments(selectedUser.assignments),
      };

      const response = await fetchWithSession(`/api/admin/users/${selectedUser.auth_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(json.error || "Failed to update user.");
      }

      await createAuditLog({
        action: "Updated User",
        description: buildAuditDescription({
          event: "Updated User",
          userName: selectedUser.full_name,
          recordType: "user",
          itemName: selectedUser.email,
          context: `Role: ${selectedUser.role} | Active: ${selectedUser.is_active}`,
        }),
      });

      await loadUsers();
      setSelectedUser(null);
      setNotice("User updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserManagementRecord) => {
    if (isOwnerEmail(user.email)) {
      setNotice("Owner account cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(`Delete ${user.full_name} (${user.email})? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetchWithSession(`/api/admin/users/${user.auth_user_id}`, { method: "DELETE" });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to delete user.");
      }

      await createAuditLog({
        action: "Deleted User",
        description: buildAuditDescription({
          event: "Deleted User",
          userName: user.full_name,
          recordType: "user",
          itemName: user.email,
        }),
      });

      await loadUsers();
      setNotice("User deleted successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserManagementRecord) => {
    const patched: UpdateUserPayload = {
      full_name: user.full_name,
      role: user.role,
      phone_number: user.phone_number,
      is_active: !user.is_active,
      force_password_change: user.force_password_change,
      assignments: safeAssignments(user.assignments),
    };

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetchWithSession(`/api/admin/users/${user.auth_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patched),
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to update active status.");
      }

      await loadUsers();
      setNotice(`User ${patched.is_active ? "activated" : "deactivated"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update active status.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user: UserManagementRecord) => {
    setSaving(true);
    setNotice(null);

    try {
      const response = await fetchWithSession(`/api/admin/users/${user.auth_user_id}/reset-password`, {
        method: "POST",
      });
      const json = (await response.json()) as { success?: boolean; error?: string; recovery_link?: string | null };
      if (!response.ok) {
        throw new Error(json.error || "Failed to reset password.");
      }

      const recoveryLink = json.recovery_link;
      if (recoveryLink) {
        await navigator.clipboard.writeText(recoveryLink);
      }

      setNotice(
        recoveryLink
          ? `Password recovery link generated and copied to clipboard for ${user.email}.`
          : `Password recovery initiated for ${user.email}.`
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  };

  const handleForcePasswordChange = async (user: UserManagementRecord, forcePasswordChange: boolean) => {
    setSaving(true);
    setNotice(null);

    try {
      const response = await fetchWithSession(`/api/admin/users/${user.auth_user_id}/force-password-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_password_change: forcePasswordChange }),
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to update force password change setting.");
      }

      await loadUsers();
      setNotice(`Force password change ${forcePasswordChange ? "enabled" : "disabled"} for ${user.email}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update force password change setting.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !authorized) {
    return <div style={styles.loading}>Preparing user management...</div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Identity & Access</p>
          <h1 style={styles.title}>Enterprise User Management</h1>
          <p style={styles.subtitle}>Create users, manage access, and enforce secure identity controls.</p>
        </div>
      </header>

      {notice && <div style={styles.notice}>{notice}</div>}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Create User</h2>
        <div style={styles.grid3}>
          <input
            value={newUser.full_name}
            onChange={(event) => setNewUser((prev) => ({ ...prev, full_name: event.target.value }))}
            placeholder="Full Name"
            style={styles.input}
          />
          <input
            value={newUser.email}
            onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email Address"
            style={styles.input}
          />
          <select
            value={newUser.role}
            onChange={(event) =>
              setNewUser((prev) => ({ ...prev, role: event.target.value as CreateUserPayload["role"] }))
            }
            style={styles.input}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.grid3}>
          <input
            value={newUser.temporary_password || ""}
            onChange={(event) => setNewUser((prev) => ({ ...prev, temporary_password: event.target.value }))}
            placeholder="Temporary Password (optional)"
            style={styles.input}
          />
          <label style={styles.switchWrap}>
            <input
              type="checkbox"
              checked={newUser.is_active}
              onChange={(event) => setNewUser((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            Active Account
          </label>
          <label style={styles.switchWrap}>
            <input
              type="checkbox"
              checked={newUser.force_password_change}
              onChange={(event) => setNewUser((prev) => ({ ...prev, force_password_change: event.target.checked }))}
            />
            Force Password Change
          </label>
        </div>

        <AssignmentEditor
          title="Workspace Permissions"
          assignments={newUser.assignments}
          onChange={(assignments) => setNewUser((prev) => ({ ...prev, assignments }))}
        />

        <button disabled={saving} onClick={handleCreateUser} style={styles.primaryButton}>
          {saving ? "Saving..." : "Create User"}
        </button>
      </section>

      <section style={styles.card}>
        <div style={styles.tableHeader}>
          <h2 style={styles.cardTitle}>Users</h2>
          <div style={styles.filterWrap}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email or role"
              style={styles.input}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              style={styles.input}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Workspace Access</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Security</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.auth_user_id}>
                    <td style={styles.td}>
                      <strong>{user.full_name}</strong>
                      <div style={styles.meta}>{user.email}</div>
                    </td>
                    <td style={styles.td}>{user.role}</td>
                    <td style={styles.td}>
                      {user.assignments.map((assignment, index) => (
                        <div key={`${user.auth_user_id}-assignment-${index}`} style={styles.assignmentPill}>
                          {assignment.workspace.toUpperCase()} • {assignment.role}
                          {assignment.vessel_id ? ` • Vessel ${assignment.vessel_id}` : ""}
                        </div>
                      ))}
                    </td>
                    <td style={styles.td}>
                      <span style={user.is_active ? styles.statusActive : styles.statusInactive}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        disabled={saving || isOwnerEmail(user.email)}
                        onClick={() => void handleResetPassword(user)}
                        style={styles.inlineButton}
                      >
                        Reset Password
                      </button>
                      <button
                        disabled={saving || isOwnerEmail(user.email)}
                        onClick={() => void handleForcePasswordChange(user, !user.force_password_change)}
                        style={styles.inlineButton}
                      >
                        {user.force_password_change ? "Disable" : "Enable"} Force Change
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button
                        disabled={saving}
                        onClick={() => setSelectedUser(user)}
                        style={styles.inlineButton}
                      >
                        Edit
                      </button>
                      <button
                        disabled={saving || isOwnerEmail(user.email)}
                        onClick={() => void handleToggleActive(user)}
                        style={styles.inlineButton}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        disabled={saving || isOwnerEmail(user.email)}
                        onClick={() => void handleDeleteUser(user)}
                        style={styles.inlineDangerButton}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedUser(null)}>
          <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <h3 style={styles.modalTitle}>Edit User</h3>
            <div style={styles.grid2}>
              <input
                value={selectedUser.full_name}
                onChange={(event) => setSelectedUser((prev) => (prev ? { ...prev, full_name: event.target.value } : prev))}
                style={styles.input}
              />
              <input value={selectedUser.email} disabled style={{ ...styles.input, background: "#f8fafc" }} />
              <select
                value={selectedUser.role}
                onChange={(event) =>
                  setSelectedUser((prev) =>
                    prev
                      ? {
                          ...prev,
                          role: event.target.value as UserManagementRecord["role"],
                        }
                      : prev
                  )
                }
                style={styles.input}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={selectedUser.phone_number || ""}
                placeholder="Phone Number"
                onChange={(event) =>
                  setSelectedUser((prev) => (prev ? { ...prev, phone_number: event.target.value || null } : prev))
                }
                style={styles.input}
              />
              <label style={styles.switchWrap}>
                <input
                  type="checkbox"
                  checked={selectedUser.is_active}
                  onChange={(event) =>
                    setSelectedUser((prev) => (prev ? { ...prev, is_active: event.target.checked } : prev))
                  }
                />
                Active
              </label>
              <label style={styles.switchWrap}>
                <input
                  type="checkbox"
                  checked={selectedUser.force_password_change}
                  onChange={(event) =>
                    setSelectedUser((prev) =>
                      prev ? { ...prev, force_password_change: event.target.checked } : prev
                    )
                  }
                />
                Force Password Change
              </label>
            </div>

            <AssignmentEditor
              title="Workspace Permissions"
              assignments={selectedUser.assignments}
              onChange={(assignments) =>
                setSelectedUser((prev) => (prev ? { ...prev, assignments } : prev))
              }
            />

            <div style={styles.modalActions}>
              <button onClick={() => setSelectedUser(null)} style={styles.secondaryButton}>
                Cancel
              </button>
              <button disabled={saving} onClick={() => void handleSaveUser()} style={styles.primaryButton}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentEditor({
  title,
  assignments,
  onChange,
}: {
  title: string;
  assignments: RoleAssignmentInput[];
  onChange: (assignments: RoleAssignmentInput[]) => void;
}) {
  const safeAssignments = assignments.length === 0 ? [defaultAssignment()] : assignments;

  return (
    <div style={styles.assignmentEditor}>
      <p style={styles.assignmentTitle}>{title}</p>
      {safeAssignments.map((assignment, index) => (
        <div key={`assignment-${index}`} style={styles.assignmentRow}>
          <select
            value={assignment.role}
            onChange={(event) => {
              const next = [...safeAssignments];
              next[index] = { ...next[index], role: event.target.value as RoleAssignmentInput["role"] };
              onChange(next);
            }}
            style={styles.input}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={`${index}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={assignment.workspace}
            onChange={(event) => {
              const workspace = event.target.value as RoleAssignmentInput["workspace"];
              const next = [...safeAssignments];
              next[index] = {
                ...next[index],
                workspace,
                vessel_id: workspace === "vessel" ? next[index].vessel_id : null,
              };
              onChange(next);
            }}
            style={styles.input}
          >
            {WORKSPACE_OPTIONS.map((option) => (
              <option key={`${index}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            value={assignment.department || ""}
            placeholder="Department (optional)"
            onChange={(event) => {
              const next = [...safeAssignments];
              next[index] = { ...next[index], department: event.target.value || null };
              onChange(next);
            }}
            style={styles.input}
          />

          <input
            type="number"
            disabled={assignment.workspace !== "vessel"}
            value={assignment.vessel_id || ""}
            placeholder="Vessel ID"
            onChange={(event) => {
              const next = [...safeAssignments];
              next[index] = {
                ...next[index],
                vessel_id: event.target.value ? Number(event.target.value) : null,
              };
              onChange(next);
            }}
            style={styles.input}
          />

          <label style={styles.switchWrap}>
            <input
              type="checkbox"
              checked={assignment.is_active}
              onChange={(event) => {
                const next = [...safeAssignments];
                next[index] = { ...next[index], is_active: event.target.checked };
                onChange(next);
              }}
            />
            Active
          </label>

          <button
            type="button"
            onClick={() => {
              const next = safeAssignments.filter((_, currentIndex) => currentIndex !== index);
              onChange(next.length > 0 ? next : [defaultAssignment()]);
            }}
            style={styles.inlineDangerButton}
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...safeAssignments, defaultAssignment()])}
        style={styles.secondaryButton}
      >
        Add Permission
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    padding: 30,
    display: "grid",
    gap: 20,
    background: "#f1f5f9",
    minHeight: "100vh",
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    fontWeight: 700,
  },
  header: {
    background: "white",
    borderRadius: 18,
    border: "1px solid #dbeafe",
    padding: 20,
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    color: "#2563eb",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  title: {
    margin: "6px 0 6px",
    color: "#0f172a",
    fontSize: 28,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: 14,
  },
  card: {
    background: "white",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    padding: 20,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gap: 14,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    color: "#0f172a",
    fontWeight: 800,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    padding: "12px 14px",
    fontSize: 14,
    color: "#0f172a",
    background: "white",
  },
  primaryButton: {
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    padding: "12px 16px",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
  },
  inlineButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#0f172a",
    padding: "8px 10px",
    cursor: "pointer",
    marginRight: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  inlineDangerButton: {
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "8px 10px",
    cursor: "pointer",
    marginRight: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  switchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px dashed #cbd5e1",
    color: "#0f172a",
    fontWeight: 600,
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  filterWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    minWidth: 320,
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1100,
  },
  th: {
    textAlign: "left",
    padding: 14,
    background: "#f8fafc",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#64748b",
  },
  td: {
    padding: 14,
    borderTop: "1px solid #e2e8f0",
    verticalAlign: "top",
    color: "#0f172a",
    fontSize: 14,
  },
  emptyCell: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
  },
  meta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  assignmentPill: {
    display: "inline-flex",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "4px 8px",
    marginRight: 6,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
  },
  statusActive: {
    display: "inline-flex",
    borderRadius: 999,
    padding: "5px 10px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
  },
  statusInactive: {
    display: "inline-flex",
    borderRadius: 999,
    padding: "5px 10px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 700,
  },
  notice: {
    borderRadius: 12,
    padding: 14,
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    fontWeight: 600,
  },
  assignmentEditor: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 10,
  },
  assignmentTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
  },
  assignmentRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    alignItems: "center",
    background: "#f8fafc",
    borderRadius: 10,
    padding: 10,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    width: "min(960px, 95vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "white",
    borderRadius: 18,
    border: "1px solid #dbeafe",
    padding: 20,
    display: "grid",
    gap: 14,
  },
  modalTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 800,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
};
