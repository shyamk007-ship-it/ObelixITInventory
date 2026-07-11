"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

interface SecurityData {
  success?: boolean;
  error?: string;
  email?: string;
  recovery_link?: string | null;
}

const generateStrongPassword = () => {
  const rand = Math.random().toString(36).slice(2);
  return `Obelix!${rand}A1`;
};

export default function UserSecurityPage() {
  const params = useParams();
  const userId = String(params?.id || "");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forceNextLogin, setForceNextLogin] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastPasswordReset, setLastPasswordReset] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

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

  const parse = async (response: Response) => {
    const text = await response.text();
    return text ? (JSON.parse(text) as SecurityData) : ({} as SecurityData);
  };

  useEffect(() => {
    const loadSecurityState = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers = new Headers();
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }

      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { method: "GET", headers });
      const text = await response.text();
      const payload = text
        ? (JSON.parse(text) as {
            success?: boolean;
            data?: { last_password_reset?: string | null };
            tabs?: { security?: { last_password_reset?: string | null; is_locked?: boolean } };
          })
        : {};

      if (response.ok && payload.success) {
        setLastPasswordReset(payload.tabs?.security?.last_password_reset || null);
        setIsLocked(Boolean(payload.tabs?.security?.is_locked));
      }
    };

    void loadSecurityState();
  }, [userId]);

  const doResetPassword = async () => {
    setSaving(true);
    setNotice(null);
    const response = await fetchWithSession(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
    const json = await parse(response);
    if (!response.ok || !json.success) {
      setNotice(json.error || "Failed to reset password.");
      setSaving(false);
      return;
    }

    if (json.recovery_link) {
      await navigator.clipboard.writeText(json.recovery_link);
      setNotice("Password reset link generated and copied.");
    } else {
      setNotice("Password reset initiated.");
    }

    setLastPasswordReset(new Date().toISOString());
    setSaving(false);
  };

  const doRequirePasswordChange = async () => {
    setSaving(true);
    setNotice(null);
    const response = await fetchWithSession(`/api/admin/users/${userId}/force-password-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_password_change: forceNextLogin }),
    });
    const json = await parse(response);
    if (!response.ok || !json.success) {
      setNotice(json.error || "Failed to update policy.");
      setSaving(false);
      return;
    }

    setNotice(`Require password change on next login: ${forceNextLogin ? "Enabled" : "Disabled"}.`);
    setSaving(false);
  };

  const doGenerateTempPassword = async () => {
    const generated = generateStrongPassword();
    setTempPassword(generated);
    setNotice("Temporary password generated locally. Use Change Password to apply.");
  };

  const doChangePassword = async () => {
    if (!newPassword && !tempPassword) {
      setNotice("Enter a new password or generate temporary password first.");
      return;
    }

    setSaving(true);
    setNotice(null);

    const passwordToApply = newPassword || tempPassword;
    const response = await fetchWithSession(`/api/admin/users/${userId}/security`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", password: passwordToApply }),
    });
    const json = await parse(response);

    if (!response.ok || !json.success) {
      setNotice(json.error || "Failed to change password.");
      setSaving(false);
      return;
    }

    setNotice("Password updated successfully.");
    setLastPasswordReset(new Date().toISOString());
    setNewPassword("");
    setSaving(false);
  };

  const doForceLogoutSessions = async () => {
    setSaving(true);
    setNotice(null);

    const response = await fetchWithSession(`/api/admin/users/${userId}/security`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "force-logout" }),
    });
    const json = await parse(response);

    if (!response.ok || !json.success) {
      setNotice(json.error || "Failed to revoke sessions.");
      setSaving(false);
      return;
    }

    setNotice("All active sessions revoked for this user.");
    setSaving(false);
  };

  const doToggleLock = async (locked: boolean) => {
    setSaving(true);
    setNotice(null);

    const response = await fetchWithSession(`/api/admin/users/${userId}/security`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: locked ? "lock" : "unlock" }),
    });
    const json = await parse(response);

    if (!response.ok || !json.success) {
      setNotice(json.error || "Failed to update account lock state.");
      setSaving(false);
      return;
    }

    setIsLocked(locked);
    setNotice(locked ? "User locked successfully." : "User unlocked successfully.");
    setSaving(false);
  };

  useEffect(() => {
    if (!lastPasswordReset) {
      setLastPasswordReset(null);
    }
  }, [lastPasswordReset]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Security Center</p>
          <h1 style={styles.title}>User Security Management</h1>
          <p style={styles.subtitle}>Reset passwords, enforce policies, and revoke sessions.</p>
        </div>
        <Link href={`/admin/users/${userId}`} style={styles.backLink}>
          Back to User Profile
        </Link>
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Password Management</h2>
          <input
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New Password"
            type="password"
            style={styles.input}
          />
          <input value={tempPassword} readOnly placeholder="Generated Temporary Password" style={styles.input} />

          <div style={styles.actions}>
            <button onClick={() => void doGenerateTempPassword()} style={styles.secondaryButton}>
              Generate Temporary Password
            </button>
            <button disabled={saving} onClick={() => void doChangePassword()} style={styles.primaryButton}>
              Change Password
            </button>
            <button disabled={saving} onClick={() => void doResetPassword()} style={styles.secondaryButton}>
              Reset Password
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Policy & Sessions</h2>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={forceNextLogin}
              onChange={(event) => setForceNextLogin(event.target.checked)}
            />
            Require password change on next login
          </label>

          <div style={styles.actions}>
            <button disabled={saving} onClick={() => void doRequirePasswordChange()} style={styles.primaryButton}>
              Save Password Policy
            </button>
            <button
              disabled={saving}
              onClick={() => void doToggleLock(!isLocked)}
              style={isLocked ? styles.secondaryButton : styles.dangerButton}
            >
              {isLocked ? "Unlock User" : "Lock User"}
            </button>
            <button disabled={saving} onClick={() => void doForceLogoutSessions()} style={styles.dangerButton}>
              Force Logout All Sessions
            </button>
          </div>

          <p style={styles.meta}>Last Password Reset: {lastPasswordReset ? new Date(lastPasswordReset).toLocaleString() : "Not recorded"}</p>
          <p style={styles.meta}>Account Lock: {isLocked ? "Locked" : "Unlocked"}</p>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: 30, background: "#f1f5f9", minHeight: "100vh", display: "grid", gap: 14 },
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
  eyebrow: { margin: 0, fontSize: 12, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 },
  title: { margin: "6px 0", color: "#0f172a", fontSize: 24, fontWeight: 800 },
  subtitle: { margin: 0, color: "#64748b" },
  backLink: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 },
  card: { background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 16, display: "grid", gap: 12 },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 },
  input: { width: "100%", borderRadius: 10, border: "1px solid #cbd5e1", padding: "12px 14px", fontSize: 14 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  primaryButton: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 700 },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#0f172a", padding: "10px 12px", cursor: "pointer", fontWeight: 700 },
  dangerButton: { border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", padding: "10px 12px", cursor: "pointer", fontWeight: 700 },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, color: "#0f172a", fontWeight: 600 },
  meta: { margin: 0, color: "#64748b", fontSize: 13 },
  notice: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 12, padding: 12, fontWeight: 600 },
};
