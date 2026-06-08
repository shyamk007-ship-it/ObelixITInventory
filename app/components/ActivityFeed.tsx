"use client";

export default function ActivityFeed({
  logs,
}: any) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>
          Recent Activity
        </h2>
      </div>

      {logs?.length === 0 && (
        <p>No activity found</p>
      )}

      {logs?.map((log: any) => (
        <div
          key={log.id}
          style={styles.item}
        >
          <div>
            <strong>
              {log.action}
            </strong>

            <p>
              {log.description}
            </p>
          </div>

          <small>
            {new Date(
              log.created_at
            ).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
  );
}

const styles: any = {
  container: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
  },

  header: {
    marginBottom: 20,
  },

  item: {
    display: "flex",
    justifyContent:
      "space-between",

    alignItems: "center",

    padding: 16,

    borderBottom:
      "1px solid #e2e8f0",
  },
};