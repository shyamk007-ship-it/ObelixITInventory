"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { getUserProfile, isEmployee } from "../lib/rbac";
import { createAuditLog, createNotification, buildAuditDescription } from "../lib/audit";
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "../lib/helpdesk";

interface AssignedAsset {
  id: number;
  asset_id: number;
  assigned_date: string;
  returned_date?: string | null;
  status: string;
  notes?: string;
  assets?: { asset_name: string; asset_tag?: string; serial_number?: string }[];
}

interface Ticket {
  id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  asset_id?: number | null;
  created_at: string;
}

export default function EmployeePage() {
  const [profile, setProfile] = useState<any>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [assignedAssets, setAssignedAssets] = useState<AssignedAsset[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketComments, setTicketComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>(ticketCategories[0]);
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>(ticketPriorities[1]);
  const [ticketAsset, setTicketAsset] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketComment, setTicketComment] = useState("");
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      const currentProfile = await getUserProfile();

      if (!currentProfile) {
        router.push("/login");
        return;
      }

      if (!isEmployee(currentProfile.role)) {
        router.push("/dashboard");
        return;
      }

      const normalizedEmail = currentProfile.email?.trim().toLowerCase() || "";

      const { data: employee, error } = await supabase
        .from("employees")
        .select("id, full_name, email, department, position")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (error || !employee) {
        setProfile({
          ...currentProfile,
          email: currentProfile.email,
          full_name: currentProfile.full_name,
          missingEmployee: true,
        });
        setLoading(false);
        return;
      }

      setProfile({
        ...currentProfile,
        full_name: employee.full_name,
        department: employee.department,
        position: employee.position,
      });
      setEmployeeId(employee.id);

      await loadAssignedAssets(employee.id);
      await loadEmployeeTickets(employee.id);
      setLoading(false);
    };

    initialize();
  }, [router]);

  const loadAssignedAssets = async (employeeId: number) => {
    const { data } = await supabase
      .from("asset_assignments")
      .select("id,asset_id,assigned_date,returned_date,status,notes,assets(asset_name,asset_tag,serial_number)")
      .eq("employee_id", employeeId)
      .order("assigned_date", { ascending: false });

    setAssignedAssets(data || []);
  };

  const loadEmployeeTickets = async (employeeId: number) => {
    const { data } = await supabase
      .from("tickets")
      .select("id,title,category,priority,status,asset_id,created_at")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    setTickets(data || []);
  };

  const loadTicketComments = async (ticketId: number) => {
    const { data } = await supabase
      .from("ticket_comments")
      .select("id, author, content, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    setTicketComments(data || []);
  };

  const handleSelectTicket = async (ticketId: number) => {
    setSelectedTicketId(ticketId);
    await loadTicketComments(ticketId);
  };

  const handleAddTicketComment = async () => {
    if (!selectedTicket || !ticketComment.trim()) {
      return;
    }

    const profile = await getUserProfile();
    const { error } = await supabase.from("ticket_comments").insert([
      {
        ticket_id: selectedTicket.id,
        author: profile?.full_name || "Unknown User",
        content: ticketComment.trim(),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setTicketComment("");
    await loadTicketComments(selectedTicket.id);
  };

  const openTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "Open").length,
    [tickets]
  );

  const inProgressTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "In Progress").length,
    [tickets]
  );

  const resolvedTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "Resolved").length,
    [tickets]
  );

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const statusBadgeStyles = (status: string) => {
    switch (status) {
      case "Open":
        return { background: "#e0f2fe", color: "#0369a1" };
      case "In Progress":
        return { background: "#fef9c3", color: "#92400e" };
      case "Resolved":
        return { background: "#dcfce7", color: "#166534" };
      case "Closed":
        return { background: "#f5f3ff", color: "#5b21b6" };
      default:
        return { background: "#e2e8f0", color: "#334155" };
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketTitle || !ticketDescription || !employeeId) {
      alert("Please complete the ticket form before submitting.");
      return;
    }

    const profile = await getUserProfile();

    const { data, error } = await supabase.from("tickets").insert([
      {
        title: ticketTitle,
        category: ticketCategory,
        priority: ticketPriority,
        status: "Open",
        asset_id: ticketAsset ? Number(ticketAsset) : null,
        employee_id: employeeId,
        description: ticketDescription,
      },
    ]).select();

    if (error || !data?.[0]) {
      alert(error?.message || "Unable to create ticket.");
      return;
    }

    await createAuditLog({
      action: "New Ticket",
      description: buildAuditDescription({
        event: "New Ticket",
        userName: profile?.full_name || "Unknown User",
        recordType: "ticket",
        recordId: data[0].id,
        itemName: ticketTitle,
      }),
    });

    await createNotification({
      title: "New ticket submitted",
      message: `${ticketTitle} was submitted by ${profile?.full_name || "an employee"}.`,
      action: "New Ticket",
      createdBy: profile?.full_name,
      recordType: "ticket",
      recordId: data[0].id,
    });

    setTicketTitle("");
    setTicketCategory(ticketCategories[0]);
    setTicketPriority(ticketPriorities[1]);
    setTicketAsset("");
    setTicketDescription("");

    if (employeeId) {
      await loadEmployeeTickets(employeeId);
    }

    alert("Ticket created successfully.");
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (profile?.missingEmployee) {
    return (
      <>
        <Sidebar />
        <div style={styles.container}>
          <TopBar />
          <div style={styles.errorCard}>
            <h1 style={styles.title}>Employee Record Not Found</h1>
            <p style={styles.subtitle}>
              We could not locate your employee profile. Please contact an administrator to link your account.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div style={styles.container}>
        <TopBar />

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Helpdesk Dashboard</h1>
            <p style={styles.subtitle}>
              Submit issues, track your tickets, and follow responses from the IT team.
            </p>
          </div>
        </div>

        <div style={styles.profileCard}>
          <h2 style={styles.sectionTitle}>My Profile</h2>
          <p>
            <strong>Name:</strong> {profile.full_name}
          </p>
          <p>
            <strong>Email:</strong> {profile.email}
          </p>
          <p>
            <strong>Role:</strong> {profile.role === "employee" ? "Employee" : profile.role}
          </p>
        </div>

        <div style={styles.ticketGrid}>
          <div style={styles.ticketCard}>
            <h2>Submit Support Ticket</h2>
            <div style={styles.formGrid}>
              <input
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="Ticket subject"
                style={styles.input}
              />
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value as TicketCategory)}
                style={styles.select}
              >
                {ticketCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={ticketPriority}
                onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
                style={styles.select}
              >
                {ticketPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select
                value={ticketAsset}
                onChange={(e) => setTicketAsset(e.target.value)}
                style={styles.select}
              >
                <option value="">Related asset (optional)</option>
                {assignedAssets.map((assignment) => (
                  <option key={assignment.id} value={assignment.asset_id}>
                    {assignment.assets?.[0]?.asset_name || "Unknown Asset"}
                  </option>
                ))}
              </select>
              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                rows={5}
                placeholder="Describe the issue"
                style={styles.textarea}
              />
            </div>
            <button type="button" onClick={handleCreateTicket} style={styles.primaryButton}>
              Create Ticket
            </button>
          </div>

          <div style={styles.ticketCard}>
            <div style={styles.ticketHistoryHeader}>
              <div>
                <h2>My Ticket History</h2>
                <p style={styles.ticketSummary}>{openTickets} open · {inProgressTickets} in progress · {resolvedTickets} resolved</p>
              </div>
              <div style={styles.badgeGroup}>
                <span style={{ ...styles.statusBadge, background: "#e0f2fe", color: "#0369a1" }}>Open</span>
                <span style={{ ...styles.statusBadge, background: "#fef9c3", color: "#92400e" }}>In Progress</span>
                <span style={{ ...styles.statusBadge, background: "#dcfce7", color: "#166534" }}>Resolved</span>
              </div>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Priority</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Asset</th>
                    <th style={styles.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td style={styles.emptyTd} colSpan={5}>
                        No ticket history yet.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        style={selectedTicketId === ticket.id ? styles.selectedRow : {}}
                        onClick={() => handleSelectTicket(ticket.id)}
                      >
                        <td style={styles.td}>{ticket.title}</td>
                        <td style={styles.td}>{ticket.priority}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.statusBadge, ...statusBadgeStyles(ticket.status) }}>{ticket.status}</span>
                        </td>
                        <td style={styles.td}>
                          {assignedAssets.find((assignment) => assignment.asset_id === ticket.asset_id)?.assets?.[0]?.asset_name || "-"}
                        </td>
                        <td style={styles.td}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {selectedTicket && (
            <div style={styles.commentPanel}>
              <h2>Ticket Details</h2>
              <div style={styles.detailCard}>
                <div style={styles.detailRow}>
                  <strong>Subject</strong>
                  <span>{selectedTicket.title}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Status</strong>
                  <span style={{ ...styles.statusBadge, ...statusBadgeStyles(selectedTicket.status) }}>{selectedTicket.status}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Priority</strong>
                  <span>{selectedTicket.priority}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Category</strong>
                  <span>{selectedTicket.category}</span>
                </div>
                <div style={styles.detailRow}>
                  <strong>Created</strong>
                  <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>

              <h3>Comments</h3>
              <div style={styles.commentList}>
                {ticketComments.length === 0 ? (
                  <div style={styles.emptyState}>No ticket activity yet.</div>
                ) : (
                  ticketComments.map((comment) => (
                    <div key={comment.id} style={styles.commentItem}>
                      <div style={styles.commentHeader}>
                        <strong>{comment.author}</strong>
                        <span>{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p style={styles.commentBody}>{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
              <textarea
                value={ticketComment}
                onChange={(e) => setTicketComment(e.target.value)}
                rows={4}
                placeholder="Add a comment to this ticket"
                style={styles.textarea}
              />
              <button type="button" onClick={handleAddTicketComment} style={styles.primaryButton}>
                Post Comment
              </button>
            </div>
          )}
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Asset</th>
                <th style={styles.th}>Assigned Date</th>
                <th style={styles.th}>Returned Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {assignedAssets.length === 0 ? (
                <tr>
                  <td style={styles.emptyTd} colSpan={5}>
                    No assigned assets found.
                  </td>
                </tr>
              ) : (
                assignedAssets.map((assignment) => (
                  <tr key={assignment.id}>
                    <td style={styles.td}>
                      {assignment.assets?.[0]?.asset_name || "Unknown Asset"}
                    </td>
                    <td style={styles.td}>{formatDate(assignment.assigned_date)}</td>
                    <td style={styles.td}>{formatDate(assignment.returned_date)}</td>
                    <td style={styles.td}>{assignment.status}</td>
                    <td style={styles.td}>{assignment.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

const styles: any = {
  container: {
    marginLeft: 260,
    padding: 30,
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 14,
  },
  profileCard: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    marginBottom: 24,
  },
  ticketGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 20,
    marginBottom: 24,
  },
  ticketCard: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  },
  ticketHistoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  badgeGroup: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  selectedRow: {
    background: "#eff6ff",
  },
  detailCard: {
    background: "white",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    marginBottom: 20,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
    color: "#334155",
  },
  commentPanel: {
    marginTop: 20,
  },
  commentList: {
    display: "grid",
    gap: 12,
    maxHeight: 360,
    overflowY: "auto",
    marginBottom: 14,
  },
  commentItem: {
    background: "#f8fafc",
    padding: 16,
    borderRadius: 16,
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    fontSize: 12,
    color: "#334155",
    marginBottom: 8,
  },
  commentBody: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  ticketSummary: {
    marginTop: 8,
    color: "#475569",
  },
  sectionTitle: {
    margin: "0 0 16px",
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
  },
  formGrid: {
    display: "grid",
    gap: 14,
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    fontSize: 14,
  },
  select: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background: "white",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    minHeight: 120,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    resize: "vertical",
  },
  primaryButton: {
    padding: "14px 20px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
    background: "white",
    borderRadius: 18,
    overflow: "hidden",
  },
  th: {
    padding: 16,
    textAlign: "left",
    background: "#f8fafc",
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
  },
  td: {
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 14,
  },
  emptyTd: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
  },
  errorCard: {
    background: "white",
    borderRadius: 18,
    padding: 32,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    marginTop: 24,
  },
};
