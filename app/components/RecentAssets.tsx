"use client";

export default function RecentAssets({
  assets,
}: any) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Recent Assets</h2>

        <a href="/admin/assets">
          View All
        </a>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              Asset
            </th>

            <th style={styles.th}>
              Category
            </th>

            <th style={styles.th}>
              Brand
            </th>

            <th style={styles.th}>
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {assets?.map((asset: any) => (
            <tr key={asset.id}>
              <td style={styles.td}>
                {asset.asset_name}
              </td>

              <td style={styles.td}>
                {asset.category}
              </td>

              <td style={styles.td}>
                {asset.brand}
              </td>

              <td style={styles.td}>
                <span
                  style={{
                    padding:
                      "6px 12px",
                    borderRadius: 20,
                    background:
                      asset.status ===
                      "Assigned"
                        ? "#fee2e2"
                        : "#dcfce7",
                    color:
                      asset.status ===
                      "Assigned"
                        ? "#dc2626"
                        : "#16a34a",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {asset.status ||
                    "Available"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: 14,
    background: "#f8fafc",
    borderBottom:
      "1px solid #e2e8f0",
  },

  td: {
    padding: 14,
    borderBottom:
      "1px solid #e2e8f0",
  },
};