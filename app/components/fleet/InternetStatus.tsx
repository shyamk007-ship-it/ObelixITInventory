"use client";

interface InternetStatusProps {
  status?: string | null;
  loading?: boolean;
}

export default function InternetStatus({
  status,
  loading = false,
}: InternetStatusProps) {
  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.skeletonLine} />
        <div style={styles.skeletonLineSmall} />
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <p style={styles.label}>Internet Status</p>
      <strong style={{ ...styles.value, ...(status === "Connected" ? styles.connected : styles.offline) }}>
        {status || "Unknown"}
      </strong>
      <p style={styles.meta}>Connectivity and uplink health for this vessel.</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "white",
    borderRadius: 18,
    padding: 18,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    minHeight: 118,
  },
  label: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  value: {
    display: "block",
    marginTop: 8,
    fontSize: 24,
    fontWeight: 800,
  },
  connected: {
    color: "#166534",
  },
  offline: {
    color: "#b91c1c",
  },
  meta: {
    margin: "8px 0 0",
    fontSize: 13,
    color: "#64748b",
  },
  skeletonLine: {
    width: 100,
    height: 24,
    borderRadius: 999,
    background: "#f1f5f9",
    marginBottom: 8,
  },
  skeletonLineSmall: {
    width: 140,
    height: 12,
    borderRadius: 999,
    background: "#f1f5f9",
  },
};
