"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  BadgeAlert,
  Building2,
  CalendarDays,
  Cake,
  ClipboardList,
  Hourglass,
  Loader2,
  UserCheck,
  Users,
} from "lucide-react";
import { fetchPeopleDashboardData, safeErrorMessage } from "../../../lib/people";
import {
  PeopleHeader,
  QuickActions,
  StatCard,
  Timeline,
  VisitorCard,
} from "../../../components/people";

const PeopleDashboardCharts = dynamic(() => import("../../../components/people/PeopleDashboardCharts"), {
  ssr: false,
  loading: () => <div style={styles.skeleton} />,
});

type Point = { label: string; value: number };

type DashboardData = Awaited<ReturnType<typeof fetchPeopleDashboardData>>;

const toMonthSeries = (values: Array<string | null | undefined>) => {
  const bucket = new Map<string, number>();
  values.forEach((raw) => {
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    bucket.set(key, (bucket.get(key) || 0) + 1);
  });
  return Array.from(bucket.entries()).map(([label, value]) => ({ label, value })).slice(-8);
};

export default function PeopleDashboardPage() {
  const [today] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchPeopleDashboardData();
        if (!active) return;
        setData(response);
      } catch (loadError) {
        if (!active) return;
        setError(loadError);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const employees = data?.employees || [];
    const departments = data?.departments || [];
    const visitors = data?.visitors || [];
    const leaves = data?.leaves || [];

    const activeEmployees = employees.filter((row) => String(row.status || "Active").toLowerCase().includes("active")).length;
    const todayKey = today.toISOString().slice(0, 10);
    const visitorsToday = visitors.filter((row) => String(row.visit_time || row.created_at || "").startsWith(todayKey)).length;
    const employeesOnLeave = leaves.filter((row) => row.status === "Approved" && row.start_date <= todayKey && row.end_date >= todayKey).length;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const newJoiners = employees.filter((row) => {
      if (!row.joining_date) return false;
      const joined = new Date(row.joining_date);
      return joined >= monthStart;
    }).length;

    const birthdays = employees.filter((row) => {
      if (!row.date_of_birth) return false;
      const dob = new Date(row.date_of_birth);
      return dob.getMonth() === today.getMonth();
    }).length;

    const workAnniversaries = employees.filter((row) => {
      if (!row.joining_date) return false;
      const joining = new Date(row.joining_date);
      return joining.getMonth() === today.getMonth();
    }).length;

    const pendingApprovals = leaves.filter((row) => row.status === "Pending").length;

    return {
      totalEmployees: employees.length,
      activeEmployees,
      departments: departments.length,
      visitorsToday,
      employeesOnLeave,
      newJoiners,
      birthdays,
      workAnniversaries,
      pendingApprovals,
    };
  }, [data, today]);

  const chartData = useMemo(() => {
    const employees = data?.employees || [];
    const attendance = data?.attendance || [];
    const visitors = data?.visitors || [];

    const byDepartmentMap = new Map<string, number>();
    const byPositionMap = new Map<string, number>();

    employees.forEach((row) => {
      const department = row.department || "Unassigned";
      const position = row.designation || "Unassigned";
      byDepartmentMap.set(department, (byDepartmentMap.get(department) || 0) + 1);
      byPositionMap.set(position, (byPositionMap.get(position) || 0) + 1);
    });

    return {
      byDepartment: Array.from(byDepartmentMap.entries()).map(([label, value]) => ({ label, value })),
      byPosition: Array.from(byPositionMap.entries()).map(([label, value]) => ({ label, value })),
      employeeGrowth: toMonthSeries(employees.map((row) => row.created_at)),
      attendanceTrend: toMonthSeries(attendance.map((row) => row.attendance_date)),
      visitorTrend: toMonthSeries(visitors.map((row) => row.created_at)),
    };
  }, [data]);

  const timelineItems = useMemo(() => {
    const visitors = (data?.visitors || []).slice(0, 4).map((row) => ({
      label: `Visitor: ${row.visitor_name}`,
      detail: `${row.company || "External"} • ${row.status || "Pending"}`,
      when: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
    }));

    const leaves = (data?.leaves || []).slice(0, 4).map((row) => ({
      label: `Leave: ${row.employees?.full_name || `Employee #${row.employee_id}`}`,
      detail: `${row.leave_type} • ${row.status}`,
      when: row.created_at ? new Date(row.created_at).toLocaleString() : "-",
    }));

    return [...visitors, ...leaves].slice(0, 8);
  }, [data]);

  const upcomingBirthdays = useMemo(() => {
    const employees = data?.employees || [];
    return employees
      .filter((row) => row.date_of_birth)
      .map((row) => {
        const date = new Date(String(row.date_of_birth));
        const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
        if (next < today) next.setFullYear(next.getFullYear() + 1);
        const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: row.id,
          name: row.full_name || "Employee",
          department: row.department || "Unassigned",
          inDays: diff,
        };
      })
      .sort((a, b) => a.inDays - b.inDays)
      .slice(0, 6);
  }, [data, today]);

  const leaveCalendar = useMemo(() => {
    return (data?.leaves || [])
      .filter((row) => row.status !== "Rejected")
      .slice(0, 6)
      .map((row) => ({
        label: row.employees?.full_name || `Employee #${row.employee_id}`,
        detail: `${row.leave_type} • ${row.start_date} to ${row.end_date}`,
        when: row.start_date,
      }));
  }, [data]);

  if (error) {
    return (
      <section style={styles.page}>
        <PeopleHeader
          title="People Dashboard"
          subtitle="Live HR insights across employees, visitors, attendance and approvals."
        />
        <div style={styles.errorCard}>{safeErrorMessage(error, "Unable to load people dashboard data.")}</div>
      </section>
    );
  }

  return (
    <section style={styles.page}>
      <PeopleHeader
        title="People Dashboard"
        subtitle="Enterprise HR command center integrated with Office Operations and IT assets."
        right={
          <QuickActions
            actions={[
              { label: "Add Employee", href: "/office/people/employees" },
              { label: "Register Visitor", href: "/office/people/visitors" },
              { label: "Create Department", href: "/office/people/departments" },
              { label: "Attendance", href: "/office/people/attendance" },
              { label: "Export", href: "/office/people/reports" },
            ]}
          />
        }
      />

      <div style={styles.kpiGrid}>
        <StatCard title="Total Employees" value={summary.totalEmployees} icon={<Users size={16} />} />
        <StatCard title="Active Employees" value={summary.activeEmployees} icon={<UserCheck size={16} />} />
        <StatCard title="Departments" value={summary.departments} icon={<Building2 size={16} />} />
        <StatCard title="Visitors Today" value={summary.visitorsToday} icon={<ClipboardList size={16} />} />
        <StatCard title="Employees On Leave" value={summary.employeesOnLeave} icon={<CalendarDays size={16} />} />
        <StatCard title="New Joiners" value={summary.newJoiners} icon={<UserCheck size={16} />} />
        <StatCard title="Birthdays" value={summary.birthdays} icon={<Cake size={16} />} />
        <StatCard title="Work Anniversaries" value={summary.workAnniversaries} icon={<Hourglass size={16} />} />
        <StatCard title="Pending Approvals" value={summary.pendingApprovals} icon={<BadgeAlert size={16} />} />
      </div>

      {isLoading ? (
        <div style={styles.loadingCard}>
          <Loader2 size={16} className="animate-spin" /> Loading people analytics...
        </div>
      ) : null}
      {!isLoading ? (
        <PeopleDashboardCharts
          byDepartment={chartData.byDepartment.length ? chartData.byDepartment : [{ label: "No Data", value: 1 }]}
          byPosition={chartData.byPosition.length ? chartData.byPosition : [{ label: "No Data", value: 1 }]}
          employeeGrowth={chartData.employeeGrowth.length ? chartData.employeeGrowth : [{ label: "No Data", value: 0 }]}
          attendanceTrend={chartData.attendanceTrend.length ? chartData.attendanceTrend : [{ label: "No Data", value: 0 }]}
          visitorTrend={chartData.visitorTrend.length ? chartData.visitorTrend : [{ label: "No Data", value: 0 }]}
        />
      ) : null}

      <div style={styles.widgets}>
        <Timeline title="Recent Activity" items={timelineItems} />

        <article style={styles.widgetCard}>
          <h3 style={styles.widgetTitle}>Upcoming Birthdays</h3>
          <div style={styles.list}>
            {upcomingBirthdays.length ? (
              upcomingBirthdays.map((row) => (
                <p key={row.id} style={styles.listItem}>
                  <strong>{row.name}</strong> • {row.department} • in {row.inDays} day(s)
                </p>
              ))
            ) : (
              <p style={styles.empty}>No birthday data available.</p>
            )}
          </div>
        </article>

        <Timeline title="Leave Calendar" items={leaveCalendar} />
      </div>

      <div style={styles.visitorGrid}>
        {(data?.visitors || []).slice(0, 4).map((visitor) => (
          <VisitorCard
            key={visitor.id}
            name={visitor.visitor_name}
            company={visitor.company || ""}
            host={visitor.employees?.full_name || "Unassigned"}
            status={visitor.status || "Pending"}
            time={visitor.visit_time ? new Date(visitor.visit_time).toLocaleString() : "-"}
          />
        ))}
        {!isLoading && (data?.visitors || []).length === 0 ? <p style={styles.empty}>No visitor records found.</p> : null}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gap: 14,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  widgets: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  widgetCard: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 14,
    display: "grid",
    gap: 10,
  },
  widgetTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
  },
  list: {
    display: "grid",
    gap: 8,
  },
  listItem: {
    margin: 0,
    color: "#334155",
    fontSize: 13,
  },
  visitorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  empty: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
  },
  errorCard: {
    borderRadius: 14,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#9f1239",
    fontWeight: 700,
    padding: 14,
  },
  loadingCard: {
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    color: "#1e3a8a",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    padding: "8px 10px",
    width: "fit-content",
  },
  skeleton: {
    borderRadius: 16,
    height: 300,
    background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
  },
};
