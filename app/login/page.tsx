"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Enter your email first");
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            "https://obelix-it-inventory.vercel.app/reset-password",
        }
      );

    if (error) {
      alert(error.message);
    } else {
      alert("Reset email sent ✅");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          Obelix IT System
        </h1>

        <p style={styles.subtitle}>
          Secure Admin Access Portal
        </p>

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
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            style={styles.input}
          />

          <button
            type="submit"
            style={styles.button}
          >
            Login
          </button>
        </form>

        <p
          onClick={handleForgotPassword}
          style={styles.forgot}
        >
          Forgot Password?
        </p>

        <p style={styles.dev}>
          © {new Date().getFullYear()}
          Obelix IT System
        </p>
      </div>
    </div>
  );
}

const styles: any = {
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
    textAlign: "center",
  },

  title: {
    color: "#38bdf8",
    marginBottom: 10,
  },

  subtitle: {
    color: "#94a3b8",
    marginBottom: 20,
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
  },

  button: {
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  forgot: {
    marginTop: 15,
    color: "#38bdf8",
    cursor: "pointer",
  },

  dev: {
    marginTop: 20,
    color: "#64748b",
    fontSize: 12,
  },
};