"use client";

import { useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import { supabase } from "../lib/supabase";
import { getPostLoginRoute, getUserProfile } from "../lib/rbac";
import { createAuditLog, buildAuditDescription } from "../lib/audit";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      alert("Password reset email sent");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* TITLE */}
        <h1 style={styles.title}>
          IT Management
        </h1>

        <p style={styles.subtitle}>
          Secure IT Management Portal
        </p>

        {/* LOGIN FORM */}
        <form
          onSubmit={handleLogin}
          style={styles.form}
        >
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            style={styles.input}
            required
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            style={styles.input}
            required
          />

          <button
            type="submit"
            style={styles.button}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        {/* FORGOT PASSWORD */}
        <p
          onClick={handleForgotPassword}
          style={styles.forgot}
        >
          Forgot Password?
        </p>

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
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg, #0f172a, #1e293b)",
    fontFamily: "Arial",
  },

  card: {
    width: 380,
    padding: 30,
    background: "#111827",
    borderRadius: 12,
    boxShadow:
      "0 10px 40px rgba(0,0,0,0.6)",
    textAlign: "center",
  },

  title: {
    color: "#38bdf8",
    fontSize: 24,
    marginBottom: 5,
  },

  subtitle: {
    color: "#94a3b8",
    marginBottom: 25,
    fontSize: 14,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  input: {
    padding: 12,
    borderRadius: 6,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    outline: "none",
  },

  button: {
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
  },

  forgot: {
    marginTop: 15,
    color: "#38bdf8",
    cursor: "pointer",
    fontSize: 14,
  },

  dev: {
    marginTop: 20,
    fontSize: 12,
    color: "#64748b",
  },

  devSmall: {
    marginTop: 5,
    fontSize: 12,
    color: "#475569",
  },
};

