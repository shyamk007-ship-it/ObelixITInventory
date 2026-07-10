import type { CSSProperties } from "react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>Access Restricted</p>
        <h1 style={styles.title}>Unauthorized</h1>
        <p style={styles.subtitle}>You do not have permission to access this page or workspace.</p>
        <Link href="/" style={styles.link}>
          ← Back to Company Portal
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "linear-gradient(145deg, #e2e8f0 0%, #f8fafc 100%)",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
    padding: 28,
    textAlign: "center",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    margin: "8px 0 10px",
    color: "#0f172a",
    fontSize: 32,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
  },
  link: {
    display: "inline-flex",
    marginTop: 18,
    color: "white",
    background: "#2563eb",
    borderRadius: 999,
    padding: "10px 16px",
    textDecoration: "none",
    fontWeight: 700,
  },
};
