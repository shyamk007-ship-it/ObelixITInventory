"use client";

export default function StatsCards({
  stats,
}: any) {
  const cards = [
    { value: stats.totalAssets, label: "Total Assets" },
    { value: stats.assignedAssets, label: "Assigned" },
    { value: stats.availableAssets, label: "Available" },
    { value: stats.employees, label: "Employees" },
    stats.openTickets !== undefined && { value: stats.openTickets, label: "Open Tickets" },
    stats.resolvedTickets !== undefined && { value: stats.resolvedTickets, label: "Resolved Tickets" },
    stats.criticalIssues !== undefined && { value: stats.criticalIssues, label: "Critical Issues" },
    stats.maintenanceDue !== undefined && { value: stats.maintenanceDue, label: "Maintenance Due" },
    stats.warrantyExpiring !== undefined && { value: stats.warrantyExpiring, label: "Warranty Expiring" },
  ].filter(Boolean);

  return (
    <div style={styles.grid}>
      {cards.map((card: any) => (
        <div key={card.label} style={styles.card}>
          <h1>{card.value ?? 0}</h1>
          <p>{card.label}</p>
        </div>
      ))}
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