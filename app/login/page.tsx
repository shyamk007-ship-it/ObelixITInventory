"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: any) => {
    e.preventDefault();

    // Demo login (we will replace with Supabase Auth later)
    if (email === "admin@obelix.com" && password === "admin123") {
      localStorage.setItem("loggedIn", "true");
      router.push("/dashboard");
    } else {
      alert("Invalid credentials ❌");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* BRAND */}
        <h1 style={styles.title}>Obelix IT System</h1>
        <p style={styles.subtitle}>Secure Admin Access Portal</p>

        {/* FORM */}
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button}>
            Login
          </button>
        </form>

        {/* FOOTER */}
        <p style={styles.dev}>
          © {new Date().getFullYear()} Obelix IT System
        </p>

        <p style={styles.devSmall}>
          Developed by <b>Shyam</b>
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
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    fontFamily: "Arial",
  },

  card: {
    width: 380,
    padding: 30,
    background: "#111827",
    borderRadius: 12,
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
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