"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AssetsChart({
  totalAssets,
  employees,
}: any) {
  const data = [
    {
      name: "Assets",
      value: totalAssets,
    },
    {
      name: "Employees",
      value: employees,
    },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        Company Analytics
      </h2>

      <ResponsiveContainer
        width="100%"
        height={320}
      >
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="value"
            fill="#2563eb"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles: any = {
  container: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.08)",
  },

  title: {
    marginBottom: 20,
    color: "#0f172a",
  },
};