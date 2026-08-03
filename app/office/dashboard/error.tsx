"use client";

import { useEffect } from "react";

export default function OfficeDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Route-level fallback to avoid full workspace crash.
    void error;
  }, [error]);

  return (
    <div style={styles.wrap} role="alert" aria-live="assertive">
      <h2 style={styles.title}>This page could not load</h2>
      <p style={styles.message}>The Office dashboard encountered an issue. You can retry loading this page.</p>
      <button type="button" onClick={reset} style={styles.button}>Retry</button>
    </div>
  );
}

const styles = {
  wrap: {
    borderRadius: 16,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    padding: "20px",
    display: "grid",
    gap: "10px",
  },
  title: {
    margin: 0,
    color: "#881337",
    fontSize: "22px",
    fontWeight: 900,
  },
  message: {
    margin: 0,
    color: "#9f1239",
    fontSize: "14px",
  },
  button: {
    width: "fit-content",
    border: "none",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
    background: "#be123c",
    color: "white",
  },
} as const;
