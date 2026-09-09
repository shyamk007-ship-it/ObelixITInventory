"use client";

import { useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import { ArrowRight, Building2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getPostLoginRoute, getUserProfile } from "../lib/rbac";
import { createAuditLog, buildAuditDescription } from "../lib/audit";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const logSecurityEvent = async (action: "login" | "failed_login" | "password_reset", context: string, auditEmail?: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      await fetch("/api/office/audit/security", {
        method: "POST",
        headers,
        body: JSON.stringify({ action, context, email: auditEmail || email }),
      });
    } catch {
      // Do not block login flow on audit failures.
    }
  };

  // LOGIN FUNCTION
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      await logSecurityEvent("failed_login", "Invalid login credentials", email);
      setLoading(false);
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();

    await createAuditLog({
      action: "Login",
      description: buildAuditDescription({
        event: "Login",
        userName: profile?.full_name || email,
        recordType: "user",
        recordId: profile?.id,
        itemName: profile?.email,
      }),
    });

    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();

    await logSecurityEvent("login", "User signed in", authenticatedUser?.email || email);

    const mustForcePasswordChange = Boolean(authenticatedUser?.user_metadata?.force_password_change);

    setLoading(false);

    if (mustForcePasswordChange) {
      window.location.href = "/profile?section=security&forced=1";
      return;
    }

    const landingRoute = profile ? await getPostLoginRoute(profile) : "/";
    window.location.href = landingRoute;
  };

  // FORGOT PASSWORD
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email first");
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${window.location.origin}/reset-password`,
        }
      );

    if (error) {
      alert(error.message);
    } else {
      await logSecurityEvent("password_reset", "Password reset requested", email);
      alert("Password reset email sent");
    }
  };

  return (
    <div className="login-page" style={styles.container}>
      <div style={styles.card}>

        <div style={styles.brandMark} aria-hidden="true">
          <Building2 size={20} strokeWidth={2.2} />
        </div>

        <p style={styles.eyebrow}>Enterprise workspace</p>
        <h1 style={styles.title}>IT Management</h1>

        <p style={styles.subtitle}>Sign in to manage office operations, assets, people, and inventory.</p>

        {/* LOGIN FORM */}
        <form
          onSubmit={handleLogin}
          style={styles.form}
        >
          <label style={styles.field}>
            <span style={styles.label}>Work email</span>
            <span style={styles.inputWrap}>
              <Mail size={16} style={styles.inputIcon} aria-hidden="true" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </span>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Password</span>
            <span style={styles.inputWrap}>
              <LockKeyhole size={16} style={styles.inputIcon} aria-hidden="true" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </span>
          </label>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonLoading : {}) }}
            disabled={loading}
          >
            <span>{loading ? "Signing in..." : "Sign in"}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* FORGOT PASSWORD */}
        <button
          type="button"
          onClick={handleForgotPassword}
          style={styles.forgot}
        >
          Forgot password?
        </button>

        {/* FOOTER */}
        <p style={styles.dev}>
          (c) {new Date().getFullYear()} IT Management
        </p>

        <p style={styles.devSmall}>
          Developed by <b>Shyam</b>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    background: "#f1f5f9",
    fontFamily: "var(--font-sans)",
  },

  card: {
    width: "min(100%, 420px)",
    padding: "36px 36px 28px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.10)",
    textAlign: "center",
  },

  brandMark: {
    width: 42,
    height: 42,
    margin: "0 auto 16px",
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
  },

  eyebrow: {
    margin: 0,
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
  },

  title: {
    color: "#172033",
    fontFamily: "var(--font-heading)",
    fontSize: 28,
    fontWeight: 700,
    margin: "8px 0 8px",
  },

  subtitle: {
    color: "#64748b",
    lineHeight: 1.6,
    margin: "0 auto 28px",
    fontSize: 14,
    maxWidth: 310,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    textAlign: "left",
  },

  field: {
    display: "grid",
    gap: 7,
  },

  label: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 600,
  },

  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  inputIcon: {
    position: "absolute",
    left: 12,
    color: "#94a3b8",
    pointerEvents: "none",
  },

  input: {
    width: "100%",
    padding: "11px 12px 11px 38px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#172033",
    outline: "none",
    minHeight: 44,
  },

  button: {
    minHeight: 44,
    padding: "0 14px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 600,
    boxShadow: "0 6px 14px rgba(37, 99, 235, 0.18)",
  },

  buttonLoading: {
    cursor: "wait",
    opacity: 0.75,
  },

  forgot: {
    margin: "20px auto 0",
    color: "#2563eb",
    background: "transparent",
    border: 0,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },

  dev: {
    marginTop: 20,
    fontSize: 12,
    color: "#94a3b8",
  },

  devSmall: {
    marginTop: 5,
    fontSize: 12,
    color: "#94a3b8",
  },
};

