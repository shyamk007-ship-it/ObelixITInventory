"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useParams } from "next/navigation";
import {
  Area,
  AreaChart,
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
import OfficeAssetModuleNav from "../../../components/office/OfficeAssetModuleNav";
import {
  OFFICE_ANALYTICS_METRICS,
  type OfficeAnalyticsMetric,
  buildAnalyticsPageState,
  exportAnalyticsToCsv,
  exportAnalyticsToExcel,
  exportAnalyticsToPdf,
  filterAnalyticsRows,
  loadOfficeAnalyticsData,
} from "../../../lib/office-analytics";
import { supabase } from "../../../lib/supabase";

const palette = ["#1d4ed8", "#2563eb", "#38bdf8", "#0f766e", "#14b8a6", "#06b6d4", "#93c5fd", "#60a5fa"];

export default function OfficeAnalyticsMetricPage() {
  const params = useParams();
  const metric = String(params?.metric || "total-office-assets") as OfficeAnalyticsMetric;
  const metricMeta = OFFICE_ANALYTICS_METRICS[metric] || OFFICE_ANALYTICS_METRICS["total-office-assets"];
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(() => buildAnalyticsPageState("total-office-assets", { assets: [], assetExtensions: {}, employees: [], tickets: [], maintenance: [], assignments: [], activity: [] }));
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const refresh = async () => {
    setLoading(true);
    const data = await loadOfficeAnalyticsData();
    setState(buildAnalyticsPageState(metric, data));
    setLastUpdated(new Date().toLocaleString());
    setLoading(false);
  };

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel(`office-analytics-${metric}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_maintenance" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_records" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_register_extensions" }, () => void refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [metric]);

  const filteredRows = useMemo(() => filterAnalyticsRows(state.rows, { search, department, category, status, startDate, endDate }), [category, department, endDate, search, startDate, state.rows, status]);

  const departments = useMemo(() => Array.from(new Set(state.rows.map((row) => row.department).filter(Boolean))), [state.rows]);
  const categories = useMemo(() => Array.from(new Set(state.rows.map((row) => row.category).filter(Boolean))), [state.rows]);
  const statuses = useMemo(() => Array.from(new Set(state.rows.map((row) => row.status).filter(Boolean))), [state.rows]);
  const exportRows = useMemo(() => filteredRows.map((row) => {
    const result: Record<string, unknown> = {};
    state.tableColumns.forEach((column) => {
      result[column] = row[column];
    });
    return result;
  }), [filteredRows, state.tableColumns]);

  const lineData = state.lineData.length > 0 ? state.lineData : filteredRows.map((row) => ({ label: row.name, value: row.value || 1 }));
  const barData = state.barData.length > 0 ? state.barData : state.summary.map((item) => ({ label: item.label, value: Number(String(item.value).replace(/[^0-9.]/g, "")) || 0 }));
  const pieData = state.pieData.length > 0 ? state.pieData : barData;
  const doughnutData = state.doughnutData.length > 0 ? state.doughnutData : pieData;

  const clearFilters = () => {
    setSearch("");
    setDepartment("all");
    setCategory("all");
    setStatus("all");
    setStartDate("");
    setEndDate("");
  };

  const dashboardCards = [
    { label: "Filtered Rows", value: filteredRows.length },
    ...state.summary,
  ].slice(0, 4);

  return (
    <div style={styles.page}>
      <OfficeAssetModuleNav />

      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Office Analytics</p>
          <h2 style={styles.title}>{metricMeta.label}</h2>
          <p style={styles.subtitle}>{metricMeta.subtitle}</p>
        </div>
        <div style={styles.heroActions}>
          <Link href="/office/dashboard" style={styles.secondaryButton}>Back to Dashboard</Link>
          <Link href="/office/analytics" style={styles.primaryButton}>Analytics Home</Link>
        </div>
      </section>

      <section style={styles.statGrid}>
        {dashboardCards.map((card) => (
          <article key={card.label} style={styles.statCard}>
            <p style={styles.statLabel}>{card.label}</p>
            <strong style={styles.statValue}>{card.value}</strong>
            {card.hint && <span style={styles.statHint}>{card.hint}</span>}
          </article>
        ))}
      </section>

      <section style={styles.filterPanel}>
        <label style={styles.field}>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search across the metric data" style={styles.input} />
        </label>
        <label style={styles.field}>
          Department
          <select value={department} onChange={(event) => setDepartment(event.target.value)} style={styles.input}>
            <option value="all">All Departments</option>
            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} style={styles.input}>
            <option value="all">All Categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.input}>
            <option value="all">All Statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          Date From
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={styles.input} />
        </label>
        <label style={styles.field}>
          Date To
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={styles.input} />
        </label>
        <div style={styles.filterActions}>
          <button type="button" style={styles.secondaryButton} onClick={clearFilters}>Clear Filters</button>
          <button type="button" style={styles.primaryButton} onClick={() => exportAnalyticsToExcel(exportRows, `${metric}-analytics.xlsx`)}>Export Excel</button>
          <button type="button" style={styles.secondaryButton} onClick={() => exportAnalyticsToCsv(exportRows, `${metric}-analytics.csv`)}>Export CSV</button>
          <button type="button" style={styles.secondaryButton} onClick={() => exportAnalyticsToPdf(metricMeta.label, exportRows, `${metric}-analytics.pdf`)}>Export PDF</button>
        </div>
      </section>

      <section style={styles.chartGrid}>
        <ChartCard title="Trend Over Time" href={metricMeta.path}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis dataKey="label" tick={{ fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribution by Segment" href={metricMeta.path}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis dataKey="label" tick={{ fill: "#64748b" }} interval={0} angle={-12} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1d4ed8" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Composition" href={metricMeta.path}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={94} innerRadius={0} paddingAngle={3}>
                {pieData.map((entry, index) => <Cell key={`${entry.label}-${index}`} fill={palette[index % palette.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Doughnut View" href={metricMeta.path}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={doughnutData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={96} innerRadius={52} paddingAngle={4}>
                {doughnutData.map((entry, index) => <Cell key={`${entry.label}-d-${index}`} fill={palette[(index + 2) % palette.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Area Forecast" href={metricMeta.path}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis dataKey="label" tick={{ fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#0f766e" fill="#d1fae5" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section style={styles.tableGrid}>
        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Detailed Data Table</h3>
            <span style={styles.cardMeta}>{filteredRows.length} records</span>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {state.tableColumns.map((column) => (
                    <th key={column} style={styles.th}>{column.replaceAll("_", " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={state.tableColumns.length} style={styles.empty}>No records match the current filters.</td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={`${row.name}-${index}`}>
                      {state.tableColumns.map((column) => (
                        <td key={`${row.name}-${column}-${index}`} style={styles.td}>{String(row[column] ?? "-")}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Recent Activity Timeline</h3>
            <span style={styles.cardMeta}>Live feed</span>
          </div>
          <div style={styles.timeline}>
            {state.recentActivity.length === 0 ? (
              <p style={styles.empty}>No recent activity available.</p>
            ) : (
              state.recentActivity.map((item, index) => (
                <div key={`${item.label}-${index}`} style={styles.timelineItem}>
                  <div style={styles.timelineDot} />
                  <div style={styles.timelineBody}>
                    <div style={styles.timelineRow}>
                      <strong style={styles.timelineTitle}>{item.label}</strong>
                      <span style={styles.timelineKind}>{item.kind}</span>
                    </div>
                    <p style={styles.timelineText}>{item.detail}</p>
                    <span style={styles.timelineDate}>{new Date(item.when).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {loading && <div style={styles.loadingOverlay}>Loading live analytics...</div>}
      {lastUpdated && <div style={styles.footerNote}>Last refreshed {lastUpdated}</div>}
    </div>
  );
}

function ChartCard({ title, href, children }: { title: string; href: string; children: ReactElement }) {
  return (
    <Link href={href} style={styles.chartCard}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>{title}</h3>
        <span style={styles.cardMeta}>Drill down</span>
      </div>
      {children}
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 16 },
  hero: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 22, borderRadius: 22, background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)", border: "1px solid rgba(191, 219, 254, 0.9)", boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)" },
  eyebrow: { margin: 0, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 11, fontWeight: 800 },
  title: { margin: "10px 0 0", color: "#0f172a", fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em" },
  subtitle: { margin: "10px 0 0", color: "#64748b", lineHeight: 1.65, maxWidth: 860 },
  heroActions: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" },
  primaryButton: { textDecoration: "none", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "white", padding: "12px 16px", borderRadius: 14, fontWeight: 800, boxShadow: "0 16px 30px rgba(37, 99, 235, 0.24)" },
  secondaryButton: { textDecoration: "none", background: "rgba(255,255,255,0.92)", color: "#0f172a", padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(191, 219, 254, 0.9)", fontWeight: 800 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 },
  statCard: { background: "rgba(255,255,255,0.96)", borderRadius: 18, border: "1px solid rgba(191, 219, 254, 0.88)", padding: 16, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)", display: "grid", gap: 6 },
  statLabel: { margin: 0, color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" },
  statValue: { color: "#0f172a", fontSize: 28, fontWeight: 900 },
  statHint: { color: "#475569", fontSize: 12 },
  filterPanel: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, padding: 18, background: "rgba(255,255,255,0.96)", borderRadius: 20, border: "1px solid rgba(191, 219, 254, 0.88)" },
  field: { display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 700 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 14, background: "white" },
  filterActions: { gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" },
  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  chartCard: { display: "grid", gap: 10, padding: 18, borderRadius: 22, background: "rgba(255,255,255,0.96)", border: "1px solid rgba(191, 219, 254, 0.88)", boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)", textDecoration: "none" },
  card: { background: "rgba(255,255,255,0.96)", borderRadius: 22, border: "1px solid rgba(191, 219, 254, 0.88)", padding: 18, boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)" },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  cardTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 },
  cardMeta: { color: "#1d4ed8", fontSize: 11, textTransform: "uppercase", fontWeight: 900, letterSpacing: "0.1em" },
  tableGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.9fr)", gap: 16 },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.06em", whiteSpace: "nowrap" },
  td: { padding: 10, borderTop: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, verticalAlign: "top", whiteSpace: "pre-line" },
  empty: { textAlign: "center", padding: 20, color: "#64748b" },
  timeline: { display: "grid", gap: 12 },
  timelineItem: { display: "grid", gridTemplateColumns: "12px 1fr", gap: 10, alignItems: "start" },
  timelineDot: { width: 10, height: 10, marginTop: 6, borderRadius: 999, background: "#2563eb", boxShadow: "0 0 0 6px rgba(37, 99, 235, 0.12)" },
  timelineBody: { display: "grid", gap: 4 },
  timelineRow: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  timelineTitle: { color: "#0f172a", fontSize: 14 },
  timelineKind: { color: "#1d4ed8", fontSize: 11, textTransform: "uppercase", fontWeight: 900, letterSpacing: "0.1em" },
  timelineText: { margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.5 },
  timelineDate: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  loadingOverlay: { position: "fixed", right: 18, bottom: 18, background: "#0f172a", color: "white", padding: "10px 14px", borderRadius: 12, fontWeight: 800, fontSize: 13 },
  footerNote: { color: "#64748b", fontSize: 12, textAlign: "right" },
};
