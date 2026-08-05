"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  buildDefaultOfficePermissions,
  getModulePermissionKeys,
  OFFICE_PERMISSION_MODULES,
  type OfficeModuleId,
  type OfficePermissionState,
} from "../../lib/office-permissions";
import { supabase } from "../../lib/supabase";
import { useOfficePermissions } from "../../hooks/useOfficePermissions";
import type { CreateUserPayload, UserManagementRecord } from "../../lib/user-management";

type UsersApiResponse = {
  success?: boolean;
  data?: UserManagementRecord[];
  tabs?: {
    login_history?: Array<{ id: number; created_at: string; action: string; description: string }>;
  };
  error?: string;
};

type UserFormState = {
  auth_user_id: string;
  full_name: string;
  email: string;
  employee_id: string;
  department: string;
  designation: string;
  temporary_password: string;
  is_active: boolean;
  office_access: boolean;
  office_is_admin: boolean;
  copy_permissions_from_user_id: string;
  permissions: OfficePermissionState;
};

const createBlankForm = (): UserFormState => ({
  auth_user_id: "",
  full_name: "",
  email: "",
  employee_id: "",
  department: "",
  designation: "",
  temporary_password: "",
  is_active: true,
  office_access: true,
  office_is_admin: false,
  copy_permissions_from_user_id: "",
  permissions: buildDefaultOfficePermissions(false),
});

export default function OfficeUsersPage() {
  const { isAdmin, can, loading: permissionLoading } = useOfficePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserManagementRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(createBlankForm());
  const [permissionSearch, setPermissionSearch] = useState("");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [loginHistory, setLoginHistory] = useState<Array<{ id: number; created_at: string; action: string; description: string }>>([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"create" | "save" | "reset" | "delete" | "load" | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const fetchWithSession = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    return fetch(input, { ...init, headers });
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await fetchWithSession("/api/admin/users?workspace=office");
    const payload = (await response.json()) as UsersApiResponse;
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Unable to load users.");
    }

    setUsers(payload.data || []);
  }, [fetchWithSession]);

  useEffect(() => {
    if (permissionLoading) return;
    if (!isAdmin && !can("settings_edit")) {
      window.location.href = "/unauthorized";
      return;
    }

    const task = async () => {
      setLoading(true);
      try {
        await loadUsers();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Unable to load users.");
      } finally {
        setLoading(false);
      }
    };

    void task();
  }, [can, isAdmin, loadUsers, permissionLoading, showToast]);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      const haystack = [
        user.full_name,
        user.email,
        user.employee_id,
        user.designation,
        user.office_department,
        user.office_is_admin ? "administrator" : "standard",
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(keyword);
    });
  }, [query, users]);

  const selectedUser = useMemo(
    () => users.find((user) => user.auth_user_id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const toFormState = useCallback((user: UserManagementRecord): UserFormState => {
    return {
      auth_user_id: user.auth_user_id,
      full_name: user.full_name,
      email: user.email,
      employee_id: user.employee_id || "",
      department: user.office_department || user.assignments[0]?.department || "",
      designation: user.designation || "",
      temporary_password: "",
      is_active: user.is_active,
      office_access: user.office_access ?? true,
      office_is_admin: Boolean(user.office_is_admin),
      copy_permissions_from_user_id: "",
      permissions: user.office_permissions || buildDefaultOfficePermissions(Boolean(user.office_is_admin)),
    };
  }, []);

  const loadUserDetails = useCallback(
    async (authUserId: string) => {
      setSelectedUserId(authUserId);
      const target = users.find((user) => user.auth_user_id === authUserId);
      if (target) {
        setForm(toFormState(target));
      }

      const response = await fetchWithSession(`/api/admin/users?workspace=office&userId=${encodeURIComponent(authUserId)}`);
      const payload = (await response.json()) as UsersApiResponse;
      if (!response.ok || !payload.success) {
        showToast(payload.error || "Unable to load user details.");
        return;
      }

      setLoginHistory(payload.tabs?.login_history || []);
    },
    [fetchWithSession, showToast, toFormState, users]
  );

  const updatePermission = (key: keyof OfficePermissionState, enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: enabled,
      },
    }));
  };

  const toggleModule = (moduleId: OfficeModuleId, enableAll: boolean) => {
    const keys = getModulePermissionKeys(moduleId);
    setForm((prev) => {
      const next = { ...prev.permissions };
      keys.forEach((key) => {
        next[key] = enableAll;
      });
      return { ...prev, permissions: next };
    });
  };

  const createUser = async () => {
    if (!form.full_name || !form.email || !form.temporary_password) {
      showToast("Full name, email, and password are required.");
      return;
    }

    const email = form.email.trim().toLowerCase();
    if (!/^(?:[a-z0-9._%+-]+)@(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(email)) {
      showToast("Please enter a valid email address.");
      return;
    }

    if (form.temporary_password.length < 8) {
      showToast("Password must be at least 8 characters.");
      return;
    }

    if (users.some((item) => item.email.trim().toLowerCase() === email)) {
      showToast("A user with this email already exists.");
      return;
    }

    const payload: CreateUserPayload = {
      full_name: form.full_name,
      email,
      employee_id: form.employee_id || null,
      designation: form.designation || null,
      temporary_password: form.temporary_password,
      phone_number: null,
      profile_photo_url: null,
      is_active: form.is_active,
      force_password_change: true,
      role: form.office_is_admin ? "office_admin" : "employee",
      assignments: [
        {
          role_id: "",
          role: form.office_is_admin ? "office_admin" : "employee",
          workspace: "office",
          vessel_id: null,
          department: form.department || null,
          is_active: form.is_active,
        },
      ],
      office_is_admin: form.office_is_admin,
      office_access: form.office_access,
      office_permissions: form.permissions,
      copy_permissions_from_user_id: form.copy_permissions_from_user_id || null,
    };

    setSaving(true);
    setActionLoading("create");
    try {
      const response = await fetchWithSession("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as UsersApiResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create user.");
      }

      setForm(createBlankForm());
      setSelectedUserId(null);
      setLoginHistory([]);
      await loadUsers();
      showToast("User created.");
      window.dispatchEvent(new Event("itinventory:office-permissions-changed"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setSaving(false);
      setActionLoading(null);
    }
  };

  const saveChanges = async () => {
    if (!selectedUserId) {
      showToast("Select a user first.");
      return;
    }

    if (!form.full_name.trim()) {
      showToast("Full name is required.");
      return;
    }

    const payload = {
      user_id: selectedUserId,
      full_name: form.full_name,
      employee_id: form.employee_id || null,
      role: form.office_is_admin ? "office_admin" : "employee",
      phone_number: null,
      designation: form.designation || null,
      profile_photo_url: null,
      is_active: form.is_active,
      force_password_change: true,
      assignments: [
        {
          role_id: "",
          role: form.office_is_admin ? "office_admin" : "employee",
          workspace: "office",
          vessel_id: null,
          department: form.department || null,
          is_active: form.is_active,
        },
      ],
      office_is_admin: form.office_is_admin,
      office_access: form.office_access,
      office_permissions: form.permissions,
      copy_permissions_from_user_id: form.copy_permissions_from_user_id || null,
    };

    setSaving(true);
    setActionLoading("save");
    try {
      const response = await fetchWithSession("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as UsersApiResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save user.");
      }

      await loadUsers();
      await loadUserDetails(selectedUserId);
      showToast("Changes saved.");
      window.dispatchEvent(new Event("itinventory:office-permissions-changed"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to save user.");
    } finally {
      setSaving(false);
      setActionLoading(null);
    }
  };

  const resetPassword = async () => {
    if (!selectedUserId) return;

    setActionLoading("reset");
    try {
      const response = await fetchWithSession(`/api/admin/users/${selectedUserId}/reset-password`, { method: "POST" });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        showToast(payload.error || "Failed to reset password.");
        return;
      }

      showToast("Password reset email/link generated.");
    } catch {
      showToast("Network error while resetting password.");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async () => {
    if (!selectedUserId) return;
    if (!window.confirm("Delete this user permanently?")) {
      return;
    }

    setActionLoading("delete");
    try {
      const response = await fetchWithSession("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId }),
      });
      const payload = (await response.json()) as UsersApiResponse;

      if (!response.ok || !payload.success) {
        showToast(payload.error || "Failed to delete user.");
        return;
      }

      setSelectedUserId(null);
      setForm(createBlankForm());
      setLoginHistory([]);
      await loadUsers();
      showToast("User deleted.");
      window.dispatchEvent(new Event("itinventory:office-permissions-changed"));
    } catch {
      showToast("Network error while deleting user.");
    } finally {
      setActionLoading(null);
    }
  };

  const visiblePermissionModules = useMemo(() => {
    const keyword = permissionSearch.trim().toLowerCase();
    if (!keyword) return OFFICE_PERMISSION_MODULES;
    return OFFICE_PERMISSION_MODULES.filter((module) => {
      const moduleText = `${module.id} ${module.label} ${module.actions.join(" ")}`.toLowerCase();
      return moduleText.includes(keyword);
    });
  }, [permissionSearch]);

  if (loading) {
    return <div style={styles.loading}>Loading user management...</div>;
  }

  return (
    <section style={styles.page}>
      <header style={styles.headerCard}>
        <div>
          <p style={styles.eyebrow}>Administration</p>
          <h2 style={styles.title}>Custom User Permission System</h2>
          <p style={styles.subtitle}>Create office users, assign exact module/actions, copy permission sets, and enforce account status.</p>
        </div>
        <div style={styles.headerActions}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
            style={styles.input}
          />
          <button type="button" onClick={() => setForm(createBlankForm())} style={styles.ghostButton} disabled={Boolean(actionLoading)}>New User</button>
          <button type="button" onClick={createUser} style={styles.primaryButton} disabled={saving || Boolean(actionLoading)}>
            {actionLoading === "create" ? "Creating..." : "Create User"}
          </button>
        </div>
      </header>

      <div style={styles.layout}>
        <aside style={styles.userListCard}>
          <h3 style={styles.sectionTitle}>Office Users</h3>
          <div style={styles.userList}>
            {filteredUsers.map((user) => (
              <button
                key={user.auth_user_id}
                type="button"
                onClick={() => void loadUserDetails(user.auth_user_id)}
                disabled={Boolean(actionLoading)}
                style={{
                  ...styles.userRow,
                  ...(selectedUserId === user.auth_user_id ? styles.userRowActive : {}),
                }}
              >
                <div>
                  <p style={styles.userName}>{user.full_name}</p>
                  <p style={styles.userMeta}>{user.email}</p>
                </div>
                <span style={user.office_is_admin ? styles.adminBadge : styles.standardBadge}>
                  {user.office_is_admin ? "Admin" : "Standard"}
                </span>
              </button>
            ))}
            {filteredUsers.length === 0 ? <p style={styles.empty}>No users found.</p> : null}
          </div>
        </aside>

        <div style={styles.editorCard}>
          <div style={styles.grid}>
            <input value={form.full_name} onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))} placeholder="Full Name" style={styles.input} />
            <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" style={styles.input} disabled={Boolean(selectedUserId)} />
            <input value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))} placeholder="Employee ID (optional)" style={styles.input} />
            <input value={form.department} onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))} placeholder="Department" style={styles.input} />
            <input value={form.designation} onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value }))} placeholder="Designation" style={styles.input} />
            {!selectedUserId ? (
              <input
                value={form.temporary_password}
                onChange={(event) => setForm((prev) => ({ ...prev, temporary_password: event.target.value }))}
                placeholder="Password"
                style={styles.input}
                type="password"
              />
            ) : null}
          </div>

          <div style={styles.switchRow}>
            <label style={styles.switchLabel}><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} /> Active</label>
            <label style={styles.switchLabel}><input type="checkbox" checked={form.office_access} onChange={(event) => setForm((prev) => ({ ...prev, office_access: event.target.checked }))} /> Office Workspace Access</label>
            <label style={styles.switchLabel}><input type="checkbox" checked={form.office_is_admin} onChange={(event) => setForm((prev) => ({ ...prev, office_is_admin: event.target.checked }))} /> Administrator</label>
          </div>

          <div style={styles.copyRow}>
            <select
              value={form.copy_permissions_from_user_id}
              onChange={(event) => setForm((prev) => ({ ...prev, copy_permissions_from_user_id: event.target.value }))}
              style={styles.input}
            >
              <option value="">Copy permissions from...</option>
              {users.map((user) => (
                <option key={user.auth_user_id} value={user.auth_user_id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.permissionHeader}>
            <h3 style={styles.sectionTitle}>Permission Matrix</h3>
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Search permissions"
              style={styles.input}
            />
          </div>

          <div style={styles.permissionList}>
            {visiblePermissionModules.map((module) => {
              const keys = getModulePermissionKeys(module.id);
              const allSelected = keys.every((key) => form.permissions[key]);
              const opened = expandedModules[module.id] ?? true;

              return (
                <article key={module.id} style={styles.permissionCard}>
                  <button
                    type="button"
                    style={styles.permissionCardHeader}
                    onClick={() => setExpandedModules((prev) => ({ ...prev, [module.id]: !opened }))}
                  >
                    <strong>{module.label}</strong>
                    <span style={styles.permissionMeta}>{allSelected ? "All Enabled" : "Custom"}</span>
                  </button>

                  {opened ? (
                    <>
                      <div style={styles.permissionActions}>
                        <button type="button" style={styles.smallButton} onClick={() => toggleModule(module.id, true)}>Select All</button>
                        <button type="button" style={styles.smallButton} onClick={() => toggleModule(module.id, false)}>Clear All</button>
                      </div>
                      <div style={styles.permissionGrid}>
                        {module.actions.map((action) => {
                          const key = `${module.id}_${action}` as keyof OfficePermissionState;
                          return (
                            <label key={key} style={styles.permissionToggle}>
                              <input
                                type="checkbox"
                                checked={form.office_is_admin ? true : Boolean(form.permissions[key])}
                                disabled={form.office_is_admin}
                                onChange={(event) => updatePermission(key, event.target.checked)}
                              />
                              <span>{action.toUpperCase()}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div style={styles.buttonRow}>
            <button type="button" style={styles.primaryButton} onClick={saveChanges} disabled={!selectedUserId || saving || Boolean(actionLoading)}>
              {actionLoading === "save" ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" style={styles.ghostButton} onClick={() => setForm(selectedUser ? toFormState(selectedUser) : createBlankForm())} disabled={Boolean(actionLoading)}>Cancel</button>
            <button type="button" style={styles.ghostButton} onClick={resetPassword} disabled={!selectedUserId || Boolean(actionLoading)}>
              {actionLoading === "reset" ? "Resetting..." : "Reset Password"}
            </button>
            <button type="button" style={styles.dangerButton} onClick={deleteUser} disabled={!selectedUserId || Boolean(actionLoading)}>
              {actionLoading === "delete" ? "Deleting..." : "Delete User"}
            </button>
          </div>

          <div style={styles.historyCard}>
            <h3 style={styles.sectionTitle}>Login History</h3>
            {loginHistory.length === 0 ? <p style={styles.empty}>No login history for selected user.</p> : null}
            {loginHistory.map((log) => (
              <div key={log.id} style={styles.logRow}>
                <span>{new Date(log.created_at).toLocaleString()}</span>
                <span>{log.action}</span>
                <span>{log.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast ? <div style={styles.toast}>{toast}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 16 },
  headerCard: { background: "rgba(255,255,255,0.95)", borderRadius: 18, border: "1px solid #dbeafe", padding: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  eyebrow: { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 800, textTransform: "uppercase", color: "#1d4ed8" },
  title: { margin: "8px 0", color: "#0f172a", fontWeight: 900, fontSize: 28 },
  subtitle: { margin: 0, color: "#64748b" },
  headerActions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  layout: { display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: 16 },
  userListCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, display: "grid", gap: 10, alignContent: "start", maxHeight: "calc(100vh - 220px)", overflow: "auto" },
  editorCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, display: "grid", gap: 14 },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 900 },
  userList: { display: "grid", gap: 8 },
  userRow: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", cursor: "pointer", textAlign: "left" },
  userRowActive: { background: "#eff6ff", borderColor: "#93c5fd" },
  userName: { margin: 0, fontWeight: 800, color: "#0f172a" },
  userMeta: { margin: "4px 0 0", color: "#64748b", fontSize: 12 },
  adminBadge: { background: "#dbeafe", color: "#1d4ed8", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 800 },
  standardBadge: { background: "#e2e8f0", color: "#334155", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  input: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0f172a", background: "white" },
  switchRow: { display: "flex", flexWrap: "wrap", gap: 14 },
  switchLabel: { display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700, color: "#1e293b" },
  copyRow: { display: "grid" },
  permissionHeader: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" },
  permissionList: { display: "grid", gap: 10 },
  permissionCard: { border: "1px solid #dbeafe", borderRadius: 12, padding: 10, background: "#f8fbff" },
  permissionCardHeader: { width: "100%", border: 0, background: "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: "#0f172a" },
  permissionMeta: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  permissionActions: { display: "flex", gap: 8, marginTop: 8 },
  smallButton: { border: "1px solid #bfdbfe", background: "white", color: "#1d4ed8", borderRadius: 8, padding: "6px 10px", fontWeight: 700, cursor: "pointer" },
  permissionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 10 },
  permissionToggle: { display: "inline-flex", gap: 8, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", background: "white", color: "#0f172a", fontWeight: 700, fontSize: 12 },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  primaryButton: { border: 0, borderRadius: 10, background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)", color: "white", fontWeight: 800, padding: "10px 14px", cursor: "pointer" },
  ghostButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "white", color: "#334155", fontWeight: 700, padding: "10px 14px", cursor: "pointer" },
  dangerButton: { border: 0, borderRadius: 10, background: "#dc2626", color: "white", fontWeight: 800, padding: "10px 14px", cursor: "pointer" },
  historyCard: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#f8fafc", display: "grid", gap: 8 },
  logRow: { display: "grid", gap: 4, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 },
  empty: { color: "#64748b", margin: 0 },
  loading: { minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontWeight: 700 },
  toast: { position: "fixed", right: 20, bottom: 20, background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 12px", fontWeight: 700, boxShadow: "0 10px 24px rgba(15,23,42,0.25)", zIndex: 300 },
};
