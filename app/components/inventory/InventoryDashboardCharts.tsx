"use client";

import type { CSSProperties } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { label: string; value: number };

interface InventoryDashboardChartsProps {
  inventoryValueTrend: Point[];
  monthlyStockMovement: Point[];
  stockByCategory: Point[];
  warehouseDistribution: Point[];
  fastMovingItems: Point[];
  slowMovingItems: Point[];
  deadStock: Point[];
  inventoryConsumption: Point[];
  topRequestedItems: Point[];
  topSuppliers: Point[];
}

const palette = ["#2563eb", "#0ea5e9", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316", "#14b8a6"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article style={styles.card}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.chartBody}>{children}</div>
    </article>
  );
}

function EmptyablePie({ rows }: { rows: Point[] }) {
  const data = rows.length ? rows : [{ label: "No Data", value: 1 }];
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" outerRadius={86} innerRadius={36}>
          {data.map((entry, index) => (
            <Cell key={`${entry.label}-${index}`} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyableBar({ rows }: { rows: Point[] }) {
  const data = rows.length ? rows : [{ label: "No Data", value: 0 }];
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyableArea({ rows }: { rows: Point[] }) {
  const data = rows.length ? rows : [{ label: "No Data", value: 0 }];
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#bfdbfe" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function InventoryDashboardCharts(props: InventoryDashboardChartsProps) {
  return (
    <div style={styles.grid}>
      <ChartCard title="Inventory Value Trend">
        <EmptyableArea rows={props.inventoryValueTrend} />
      </ChartCard>
      <ChartCard title="Monthly Stock Movement">
        <EmptyableBar rows={props.monthlyStockMovement} />
      </ChartCard>
      <ChartCard title="Stock by Category">
        <EmptyablePie rows={props.stockByCategory} />
      </ChartCard>
      <ChartCard title="Warehouse Distribution">
        <EmptyablePie rows={props.warehouseDistribution} />
      </ChartCard>
      <ChartCard title="Fast Moving Items">
        <EmptyableBar rows={props.fastMovingItems} />
      </ChartCard>
      <ChartCard title="Slow Moving Items">
        <EmptyableBar rows={props.slowMovingItems} />
      </ChartCard>
      <ChartCard title="Dead Stock">
        <EmptyableBar rows={props.deadStock} />
      </ChartCard>
      <ChartCard title="Inventory Consumption">
        <EmptyableArea rows={props.inventoryConsumption} />
      </ChartCard>
      <ChartCard title="Top Requested Items">
        <EmptyableBar rows={props.topRequestedItems} />
      </ChartCard>
      <ChartCard title="Top Suppliers">
        <EmptyableBar rows={props.topSuppliers} />
      </ChartCard>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 12,
  },
  card: {
    borderRadius: 14,
    border: "1px solid #dbeafe",
    background: "#ffffff",
    boxShadow: "0 18px 30px rgba(15, 23, 42, 0.06)",
    padding: 12,
  },
  title: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 900,
  },
  chartBody: {
    height: 260,
  },
};
