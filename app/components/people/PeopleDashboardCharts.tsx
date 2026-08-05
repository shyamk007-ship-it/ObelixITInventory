"use client";

import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "./ChartCard";

interface SeriesPoint {
  label: string;
  value: number;
}

interface PeopleDashboardChartsProps {
  byDepartment: SeriesPoint[];
  byPosition: SeriesPoint[];
  employeeGrowth: SeriesPoint[];
  attendanceTrend: SeriesPoint[];
  visitorTrend: SeriesPoint[];
}

const colors = ["#2563eb", "#0ea5e9", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

const commonAxisTick = { fill: "#64748b", fontSize: 12 };

export default function PeopleDashboardCharts({
  byDepartment,
  byPosition,
  employeeGrowth,
  attendanceTrend,
  visitorTrend,
}: PeopleDashboardChartsProps) {
  return (
    <div style={styles.grid}>
      <ChartCard title="Employees by Department">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byDepartment}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
            <XAxis dataKey="label" tick={commonAxisTick} interval={0} angle={-14} textAnchor="end" height={58} />
            <YAxis allowDecimals={false} tick={commonAxisTick} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Employees by Position">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={byPosition} dataKey="value" nameKey="label" innerRadius={44} outerRadius={88}>
              {byPosition.map((row, index) => (
                <Cell key={`${row.label}-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Employee Growth">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={employeeGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
            <XAxis dataKey="label" tick={commonAxisTick} />
            <YAxis allowDecimals={false} tick={commonAxisTick} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Attendance Trend">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
            <XAxis dataKey="label" tick={commonAxisTick} />
            <YAxis allowDecimals={false} tick={commonAxisTick} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Visitor Trend">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={visitorTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
            <XAxis dataKey="label" tick={commonAxisTick} />
            <YAxis allowDecimals={false} tick={commonAxisTick} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
};
