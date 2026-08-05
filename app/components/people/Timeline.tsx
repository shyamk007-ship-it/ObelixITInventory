import type { CSSProperties } from "react";

interface TimelineItem {
  label: string;
  detail: string;
  when: string;
}

interface TimelineProps {
  title: string;
  items: TimelineItem[];
}

export default function Timeline({ title, items }: TimelineProps) {
  return (
    <article style={styles.card}>
      <h3 style={styles.title}>{title}</h3>
      {items.length === 0 ? <p style={styles.empty}>No activity available.</p> : null}
      <div style={styles.list}>
        {items.map((item) => (
          <div key={`${item.label}-${item.when}`} style={styles.item}>
            <span style={styles.dot} />
            <div style={styles.content}>
              <strong style={styles.label}>{item.label}</strong>
              <p style={styles.detail}>{item.detail}</p>
              <small style={styles.when}>{item.when}</small>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 14,
    display: "grid",
    gap: 10,
    minHeight: 240,
  },
  title: {
    margin: 0,
    fontSize: 16,
    color: "#0f172a",
    fontWeight: 800,
  },
  empty: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
  },
  list: {
    display: "grid",
    gap: 10,
  },
  item: {
    display: "grid",
    gridTemplateColumns: "14px 1fr",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 5,
    background: "#2563eb",
  },
  content: {
    display: "grid",
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: "#0f172a",
  },
  detail: {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
  },
  when: {
    color: "#94a3b8",
    fontSize: 11,
  },
};
