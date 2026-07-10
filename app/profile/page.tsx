"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useEnterpriseAccess } from "../components/shared/EnterpriseAccessProvider";
import { buildAuditDescription, createAuditLog } from "../lib/audit";

interface LoginHistoryItem {
  id: string;
  created_at: string;
  action: string;
  description: string;
}

type ProfileSection = "profile" | "settings" | "notifications" | "security";

const getSection = (value: string | null): ProfileSection => {
  if (value === "settings" || value === "notifications" || value === "security") {
    return value;
  }
  return "profile";
};

export default function ProfilePage() {
  const router = useRouter();
  const { loading, profile, assignments } = useEnterpriseAccess();
  const [section, setSection] = useState<ProfileSection>("profile");
  const [forcedPasswordChange, setForcedPasswordChange] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const initialStateTimerRef = useRef<number | null>(null);
  const metadataTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    const readSection = () => {
      const params = new URLSearchParams(window.location.search);
      const currentSection = params.get("section");
      const forced = params.get("forced") === "1";

      setForcedPasswordChange(forced);
      setSection(forced ? "security" : getSection(currentSection));
    };

    readSection();
    window.addEventListener("popstate", readSection);

    return () => {
      window.removeEventListener("popstate", readSection);
    };
  }, []);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
      return;
    }

    if (profile) {
      initialStateTimerRef.current = window.setTimeout(() => {
        setFullName(profile.full_name || "");
      }, 0);
    }

    return () => {
      if (initialStateTimerRef.current !== null) {
        window.clearTimeout(initialStateTimerRef.current);
      }
    };
  }, [loading, profile, router]);

  const loadCurrentUserMetadata = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      setAuthUserId(user.id);
      setPhoneNumber(String(user.user_metadata?.phone_number || ""));
      setProfilePhotoUrl(String(user.user_metadata?.avatar_url || "") || null);
      setFullName(String(user.user_metadata?.full_name || profile?.full_name || ""));
    }
  }, [profile?.full_name]);

  const loadLoginHistory = useCallback(async () => {
    const response = await fetchWithSession("/api/profile/login-history", { method: "GET" });
    const json = (await response.json()) as { data?: LoginHistoryItem[]; error?: string };

    if (!response.ok) {
      setNotice(json.error || "Unable to load login history.");
      return;
    }

    setLoginHistory(json.data || []);
  }, [fetchWithSession]);

  useEffect(() => {
    if (profile) {
      metadataTimerRef.current = window.setTimeout(() => {
        void loadCurrentUserMetadata();
        void loadLoginHistory();
      }, 0);
    }

    return () => {
      if (metadataTimerRef.current !== null) {
        window.clearTimeout(metadataTimerRef.current);
      }
    };
  }, [loadCurrentUserMetadata, loadLoginHistory, profile]);

  const workspaceAccess = useMemo(() => {
    if (assignments.length === 0) {
      return ["Company Portal"];
    }

    return assignments.map((assignment) => {
      const vesselPart = assignment.vessel_id ? ` • Vessel ${assignment.vessel_id}` : "";
      return `${assignment.workspace.toUpperCase()} • ${assignment.role}${vesselPart}`;
    });
  }, [assignments]);

  const handleProfileSave = async () => {
    if (!profile) return;

    setSaving(true);
    setNotice(null);

    try {
      const updateResult = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          avatar_url: profilePhotoUrl,
        },
      });

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }

      await supabase
        .from("users")
        .update({ full_name: fullName, phone_number: phoneNumber, profile_photo_url: profilePhotoUrl })
        .ilike("email", profile.email);

      await createAuditLog({
        action: "Updated Profile",
        description: buildAuditDescription({
          event: "Updated Profile",
          userName: fullName,
          recordType: "user",
          itemName: profile.email,
        }),
      });

      setNotice("Profile updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      setNotice("Please enter and confirm the new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice("Password confirmation does not match.");
      return;
    }

    if (newPassword.length < 8) {
      setNotice("Password must be at least 8 characters long.");
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const result = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          force_password_change: false,
        },
      });
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (profile) {
        await supabase.from("users").update({ force_password_change: false }).ilike("email", profile.email);
      }

      setNewPassword("");
      setConfirmPassword("");

      if (forcedPasswordChange) {
        setForcedPasswordChange(false);
        setSection("profile");
        router.replace("/profile?section=profile");
      }

      setNotice("Password updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file || !profile) return;

    setSaving(true);
    setNotice(null);

    try {
      let resolvedAuthUserId = authUserId;
      if (!resolvedAuthUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        resolvedAuthUserId = user?.id || null;
      }

      if (!resolvedAuthUserId) {
        throw new Error("Unable to resolve authenticated user for photo upload.");
      }

      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${resolvedAuthUserId}/${Date.now()}.${extension}`;
      const uploadResult = await supabase.storage.from("profile-photos").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message);
      }

      const { data: publicData } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
      const url = publicData.publicUrl;
      setProfilePhotoUrl(url);
      setNotice("Profile photo uploaded. Save profile to apply.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to upload profile photo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <div style={styles.loading}>Loading profile...</div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Identity</p>
          <h1 style={styles.title}>My Profile</h1>
          <p style={styles.subtitle}>Manage your account, security, and workspace access.</p>
        </div>
      </header>

      <div style={styles.tabBar}>
        <TabButton
          label="My Profile"
          active={section === "profile"}
          onClick={() => {
            if (forcedPasswordChange) return;
            setSection("profile");
            router.push("/profile?section=profile");
          }}
        />
        <TabButton
          label="Account Settings"
          active={section === "settings"}
          onClick={() => {
            if (forcedPasswordChange) return;
            setSection("settings");
            router.push("/profile?section=settings");
          }}
        />
        <TabButton
          label="Notifications"
          active={section === "notifications"}
          onClick={() => {
            if (forcedPasswordChange) return;
            setSection("notifications");
            router.push("/profile?section=notifications");
          }}
        />
        <TabButton
          label="Security"
          active={section === "security"}
          onClick={() => {
            setSection("security");
            router.push("/profile?section=security");
          }}
        />
      </div>

      {notice && <div style={styles.notice}>{notice}</div>}

      {(section === "profile" || section === "settings") && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Account Details</h2>
          <div style={styles.grid2}>
            <div style={styles.photoWrap}>
              <div style={styles.avatar}>
                {profilePhotoUrl ? (
                  <Image src={profilePhotoUrl} alt="Profile" width={88} height={88} style={styles.avatarImage} unoptimized />
                ) : (
                  fullName.charAt(0)
                )}
              </div>
              <label style={styles.uploadButton}>
                Upload Profile Photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    void handlePhotoUpload(file);
                  }}
                />
              </label>
            </div>

            <div style={styles.formWrap}>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} style={styles.input} placeholder="Full Name" />
              <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} style={styles.input} placeholder="Phone Number" />
              <input value={profile.email} disabled style={{ ...styles.input, background: "#f8fafc" }} />
              <input value={profile.role} disabled style={{ ...styles.input, background: "#f8fafc" }} />
            </div>
          </div>
          <button onClick={() => void handleProfileSave()} disabled={saving} style={styles.primaryButton}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </section>
      )}

      {(section === "profile" || section === "settings") && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Workspace Access</h2>
          <div style={styles.pillGrid}>
            {workspaceAccess.map((item) => (
              <span key={item} style={styles.pill}>
                {item}
              </span>
            ))}
          </div>
        </section>
      )}

      {(section === "profile" || section === "security") && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Security</h2>
          {forcedPasswordChange && (
            <div style={styles.forceBanner}>
              Password change is required before continuing to other sections.
            </div>
          )}
          <div style={styles.grid2}>
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              placeholder="New Password"
              style={styles.input}
            />
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              placeholder="Confirm Password"
              style={styles.input}
            />
          </div>
          <button onClick={() => void handlePasswordChange()} disabled={saving} style={styles.primaryButton}>
            {saving ? "Updating..." : "Change Password"}
          </button>
        </section>
      )}

      {(section === "profile" || section === "notifications") && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Login History</h2>
          <div style={styles.historyList}>
            {loginHistory.length === 0 ? (
              <p style={styles.emptyText}>No login history available.</p>
            ) : (
              loginHistory.map((entry) => (
                <div key={entry.id} style={styles.historyItem}>
                  <strong style={styles.historyAction}>{entry.action}</strong>
                  <p style={styles.historyMeta}>{new Date(entry.created_at).toLocaleString()}</p>
                  <p style={styles.historyDescription}>{entry.description}</p>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.tabButton,
        ...(active ? styles.tabButtonActive : {}),
      }}
    >
      {label}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: 30,
    display: "grid",
    gap: 16,
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
    padding: 20,
    border: "1px solid #dbeafe",
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontWeight: 700,
  },
  title: {
    margin: "8px 0 6px",
    fontSize: 28,
    color: "#0f172a",
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
  },
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  tabButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tabButtonActive: {
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "white",
  },
  notice: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: 12,
    borderRadius: 12,
    fontWeight: 600,
  },
  forceBanner: {
    background: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fcd34d",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 700,
    fontSize: 13,
  },
  card: {
    background: "white",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    padding: 20,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  formWrap: {
    display: "grid",
    gap: 10,
  },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    padding: "12px 14px",
    fontSize: 14,
  },
  primaryButton: {
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  photoWrap: {
    display: "grid",
    justifyItems: "start",
    gap: 10,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 800,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  uploadButton: {
    border: "1px dashed #2563eb",
    borderRadius: 10,
    padding: "8px 12px",
    color: "#2563eb",
    fontWeight: 700,
    cursor: "pointer",
    background: "#eff6ff",
  },
  pillGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 10px",
  },
  historyList: {
    display: "grid",
    gap: 10,
  },
  historyItem: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 12,
    background: "#f8fafc",
  },
  historyAction: {
    color: "#0f172a",
    fontSize: 14,
  },
  historyMeta: {
    margin: "4px 0",
    color: "#64748b",
    fontSize: 12,
  },
  historyDescription: {
    margin: 0,
    color: "#334155",
    fontSize: 13,
  },
  emptyText: {
    margin: 0,
    color: "#64748b",
  },
};
