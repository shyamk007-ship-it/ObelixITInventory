import type { CSSProperties } from "react";

interface TimelineRow {
  label: string;
  detail: string;
  when: string;
}

interface InventoryTimelineProps {
  title: string;
  rows: TimelineRow[];
}

export default function InventoryTimeline({ title, rows }: InventoryTimelineProps) {
  return (
    <article style={styles.card}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.timeline}>
        {rows.length ? (
          rows.map((row, index) => (
            <div key={`${row.label}-${index}`} style={styles.item}>
              <span style={styles.dot} />
              <div>
                <p style={styles.label}>{row.label}</p>
                <p style={styles.detail}>{row.detail}</p>
                <p style={styles.when}>{row.when}</p>
              </div>
            </div>
          ))
        ) : (
          <p style={styles.empty}>No timeline events found.</p>
        )}
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
    padding: 12,
    display: "grid",
    gap: 10,
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 900,
  },
  timeline: {
    display: "grid",
    gap: 10,
  },
  item: {
    display: "grid",
    gridTemplateColumns: "10px 1fr",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 999,
    background: "#2563eb",
    display: "inline-block",
  },
  label: {
    margin: 0,
    color: "#1e293b",
    fontSize: 13,
    fontWeight: 800,
  },
  detail: {
    margin: "2px 0 0",
    color: "#475569",
    fontSize: 12,
  },
  when: {
    margin: "2px 0 0",
    color: "#64748b",
    fontSize: 11,
  },
  empty: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
  },
};
