import type { CSSProperties } from "react";

type ActivityRow = {
  created_at?: string;
  action?: string;
  description?: string;
};

interface UserActivityFeedProps {
  rows: ActivityRow[];
  emptyMessage: string;
}

const toneByAction: Array<{ pattern: RegExp; tone: "positive" | "warning" | "neutral" }> = [
  { pattern: /(created|enabled|granted|activated|unlock)/i, tone: "positive" },
  { pattern: /(deleted|removed|disabled|revoked|deactivated|lock)/i, tone: "warning" },
];

function getTone(action: string): "positive" | "warning" | "neutral" {
  for (const item of toneByAction) {
    if (item.pattern.test(action)) {
      return item.tone;
    }
  }
  return "neutral";
}

function formatDate(value?: string) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
}

export default function UserActivityFeed({ rows, emptyMessage }: UserActivityFeedProps) {
  if (!rows.length) {
    return <p style={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div style={styles.feed}>
      {rows.map((row, index) => {
        const action = row.action || "Event";
        const tone = getTone(action);

        return (
          <article key={`${row.created_at || "event"}-${index}`} style={styles.item}>
            <div
              style={{
                ...styles.marker,
                ...(tone === "positive"
                  ? styles.markerPositive
                  : tone === "warning"
                    ? styles.markerWarning
                    : styles.markerNeutral),
              }}
            />
            <div style={styles.content}>
              <div style={styles.rowTop}>
                <strong style={styles.action}>{action}</strong>
                <span
                  style={{
                    ...styles.badge,
                    ...(tone === "positive"
                      ? styles.badgePositive
                      : tone === "warning"
                        ? styles.badgeWarning
                        : styles.badgeNeutral),
                  }}
                >
                  {tone}
                </span>
              </div>
              <p style={styles.description}>{row.description || "No description."}</p>
              <p style={styles.timestamp}>{formatDate(row.created_at)}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  feed: { display: "grid", gap: 12 },
  item: {
    display: "grid",
    gridTemplateColumns: "14px 1fr",
    gap: 12,
    alignItems: "flex-start",
  },
  marker: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginTop: 8,
  },
  markerPositive: { background: "#16a34a" },
  markerWarning: { background: "#dc2626" },
  markerNeutral: { background: "#2563eb" },
  content: {
    border: "1px solid #dbeafe",
    borderRadius: 12,
    padding: 12,
    background: "#f8fafc",
    display: "grid",
    gap: 6,
  },
  rowTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  action: { color: "#0f172a", fontWeight: 800 },
  badge: {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: "0.06em",
  },
  badgePositive: { background: "#dcfce7", color: "#166534" },
  badgeWarning: { background: "#fee2e2", color: "#991b1b" },
  badgeNeutral: { background: "#dbeafe", color: "#1e3a8a" },
  description: { margin: 0, color: "#334155" },
  timestamp: { margin: 0, color: "#94a3b8", fontSize: 12 },
  empty: { margin: 0, color: "#64748b" },
};
