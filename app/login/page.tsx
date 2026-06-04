"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (username === "admin" && password === "admin") {
        localStorage.setItem("loggedIn", "true");
        router.push("/dashboard");
      } else {
        alert("Invalid credentials ❌");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>IT Inventory System</h1>
        <p style={styles.subtitle}>Admin Login Portal</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div style={styles.row}>
            <label style={styles.checkbox}>
              <input type="checkbox" /> Remember me
            </label>

            <a href="#" style={styles.link}>
              Forgot password?
            </a>
          </div>

          <button style={styles.button} type="submit">
            {loading ? "Logging in..." : "Login"}
          </button>

          <div style={styles.footer}>
            <p>Default login: admin / admin</p>
          </div>
        </form>
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
    fontFamily: "Arial"
  },
  card: {
    width: 380,
    padding: 30,
    borderRadius: 12,
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(10px)",
    color: "white",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
  },
  title: {
    textAlign: "center",
    marginBottom: 5
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  input: {
    padding: 12,
    borderRadius: 6,
    border: "none",
    outline: "none"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12
  },
  checkbox: {
    display: "flex",
    gap: 5
  },
  link: {
    color: "#60a5fa",
    textDecoration: "none"
  },
  button: {
    padding: 12,
    borderRadius: 6,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer"
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    opacity: 0.6,
    marginTop: 10
  }
};