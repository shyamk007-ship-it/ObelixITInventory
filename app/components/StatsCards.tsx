"use client";

export default function StatsCards({
  stats,
}: any) {
  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h1>
          {stats.totalAssets}
        </h1>

        <p>Total Assets</p>
      </div>

      <div style={styles.card}>
        <h1>
          {stats.assignedAssets}
        </h1>

        <p>Assigned</p>
      </div>

      <div style={styles.card}>
        <h1>
          {stats.availableAssets}
        </h1>

        <p>Available</p>
      </div>

      <div style={styles.card}>
        <h1>
          {stats.employees}
        </h1>

        <p>Employees</p>
      </div>
    </div>
  );
}

const styles: any = {
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 20,
    marginBottom: 30,
  },

  card: {
    background: "white",
    padding: 25,
    borderRadius: 16,
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.08)",
  },
};