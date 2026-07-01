"use client";

interface FleetStatCardProps {
  label: string;
  value: string | number;
  description?: string;
  loading?: boolean;
}

export default function FleetStatCard({
  label,
  value,
  description,
  loading = false,
}: FleetStatCardProps) {
  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.skeletonLabel} />
        <div style={styles.skeletonValue} />
        <div style={styles.skeletonText} />
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <p style={styles.label}>{label}</p>
      <strong style={styles.value}>{value}</strong>
      {description ? <p style={styles.description}>{description}</p> : null}
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
    color: "#0f172a",
    fontWeight: 800,
  },
  description: {
    margin: "8px 0 0",
    fontSize: 13,
    color: "#64748b",
  },
  skeletonLabel: {
    width: 90,
    height: 10,
    borderRadius: 999,
    background: "#e2e8f0",
    marginBottom: 10,
  },
  skeletonValue: {
    width: 70,
    height: 24,
    borderRadius: 999,
    background: "#f1f5f9",
    marginBottom: 8,
  },
  skeletonText: {
    width: 120,
    height: 12,
    borderRadius: 999,
    background: "#f1f5f9",
  },
};
