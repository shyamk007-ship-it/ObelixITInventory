"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../../lib/audit";
import { getUserProfile } from "../../../lib/rbac";
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
} from "../../../lib/helpdesk";

interface Asset {
  id: number;
  asset_name: string;
}

interface Employee {
  id: number;
  full_name: string;
}

interface User {
  id: number;
  full_name: string;
  role: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  asset_id?: number | null;
  employee_id?: number | null;
  assigned_to?: number | null;
  created_at: string;
  updated_at?: string | null;
}

interface TicketComment {
  id: number;
  ticket_id: number;
  author: string;
  content: string;
  created_at: string;
}

export default function TicketsAdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState(ticketCategories[0]);
  const [newTicketPriority, setNewTicketPriority] = useState(ticketPriorities[1]);
  const [newTicketAsset, setNewTicketAsset] = useState("");
  const [newTicketEmployee, setNewTicketEmployee] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [commentText, setCommentText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>(ticketStatuses[0]);
  const [selectedPriority, setSelectedPriority] = useState<string>(ticketPriorities[1]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
    const channel = supabase
      .channel("tickets_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        loadTickets
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        loadTickets
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadInitialData = async () => {
    await Promise.all([loadTickets(), loadAssets(), loadEmployees(), loadStaff()]);
  };

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setTickets(data || []);
    }
  };

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("id, asset_name")
      .order("asset_name", { ascending: true });

    if (!error) {
      setAssets(data || []);
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (!error) {
      setEmployees(data || []);
    }
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, role")
      .in("role", ["admin", "it_staff"])
      .order("full_name", { ascending: true });

    if (!error) {
      setStaff(data || []);
    }
  };

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.description.toLowerCase().includes(normalizedSearch) ||
        ticket.category.toLowerCase().includes(normalizedSearch) ||
        ticket.priority.toLowerCase().includes(normalizedSearch) ||
        ticket.status.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        filterStatus === "All" ? true : ticket.status === filterStatus;
      const matchesPriority =
        filterPriority === "All" ? true : ticket.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, search, filterStatus, filterPriority]);

  const groupedTickets = useMemo(
    () =>
      ticketStatuses.reduce((groups, status) => {
        groups[status] = filteredTickets.filter((ticket) => ticket.status === status);
        return groups;
      }, {} as Record<string, Ticket[]>),
    [filteredTickets]
  );

  const loadComments = async (ticketId: number) => {
    const { data, error } = await supabase
      .from("ticket_comments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (!error) {
      setComments(data || []);
    } else {
      setComments([]);
    }
  };

  const handleSelectTicket = async (ticketId: number) => {
    setSelectedTicketId(ticketId);
    await loadComments(ticketId);
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) {
      setSelectedStatus(ticket.status);
      setSelectedPriority(ticket.priority);
      setSelectedAssignee(ticket.assigned_to ? String(ticket.assigned_to) : "");
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketTitle || !newTicketDescription || !newTicketEmployee) {
      alert("Title, description, and ticket owner are required.");
      return;
    }

    setLoading(true);
    const profile = await getUserProfile();

    const { data, error } = await supabase.from("tickets").insert([
      {
        title: newTicketTitle,
        description: newTicketDescription,
        category: newTicketCategory,
        priority: newTicketPriority,
        asset_id: newTicketAsset ? Number(newTicketAsset) : null,
        employee_id: Number(newTicketEmployee),
        status: "Open",
        assigned_to: null,
      },
    ]).select();

    if (error || !data?.[0]) {
      alert(error?.message || "Unable to create ticket.");
      setLoading(false);
      return;
    }

    const createdTicket = data[0];
    await createAuditLog({
      action: "New Ticket",
      description: buildAuditDescription({
        event: "New Ticket",
        userName: profile?.full_name || "Unknown User",
        recordType: "ticket",
        recordId: createdTicket.id,
        itemName: newTicketTitle,
      }),
    });

    setNewTicketTitle("");
    setNewTicketDescription("");
    setNewTicketAsset("");
    setNewTicketEmployee("");
    setNewTicketCategory(ticketCategories[0]);
    setNewTicketPriority(ticketPriorities[1]);

    await loadTickets();
    setLoading(false);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    setLoading(true);
    const profile = await getUserProfile();

    const { error } = await supabase
      .from("tickets")
      .update({
        status: selectedStatus,
        priority: selectedPriority,
        assigned_to: selectedAssignee ? Number(selectedAssignee) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTicket.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await createAuditLog({
      action: selectedStatus === "Resolved" ? "Ticket Resolved" : "Ticket Updated",
      description: buildAuditDescription({
        event: "Ticket Updated",
        userName: profile?.full_name || "Unknown User",
        recordType: "ticket",
        recordId: selectedTicket.id,
        itemName: selectedTicket.title,
        context: `Status: ${selectedStatus}, Priority: ${selectedPriority}`,
      }),
    });

    await loadTickets();
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !commentText.trim()) {
      return;
    }

    const profile = await getUserProfile();
    const { error } = await supabase.from("ticket_comments").insert([
      {
        ticket_id: selectedTicket.id,
        author: profile?.full_name || "Unknown User",
        content: commentText.trim(),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setCommentText("");
    await loadComments(selectedTicket.id);
  };

  const exportTickets = () => {
    const rows = [
      [
        "ID",
        "Title",
        "Category",
        "Priority",
        "Status",
        "Asset",
        "Requester",
        "Assigned To",
        "Created At",
      ],
      ...tickets.map((ticket) => [
        ticket.id,
        ticket.title,
        ticket.category,
        ticket.priority,
        ticket.status,
        assets.find((asset) => asset.id === ticket.asset_id)?.asset_name || "",
        employees.find((employee) => employee.id === ticket.employee_id)?.full_name || "",
        staff.find((user) => user.id === ticket.assigned_to)?.full_name || "",
        new Date(ticket.created_at).toLocaleString(),
      ]),
    ];

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "it-tickets-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const selectedTicketAssigneeName = selectedTicket?.assigned_to
    ? staff.find((user) => user.id === selectedTicket.assigned_to)?.full_name || "Unassigned"
    : "Unassigned";

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1>Support Tickets</h1>
          <p>Manage requests, assign ownership, and keep tickets moving.</p>
        </div>
        <button onClick={exportTickets} style={styles.actionButton}>
          Export Tickets
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.card}>
            <h2>New Support Ticket</h2>
            <div style={styles.formGrid}>
              <input
                value={newTicketTitle}
                onChange={(e) => setNewTicketTitle(e.target.value)}
                placeholder="Issue title"
                style={styles.input}
              />
              <select
                value={newTicketCategory}
                onChange={(e) => setNewTicketCategory(e.target.value)}
                style={styles.select}
              >
                {ticketCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={newTicketPriority}
                onChange={(e) => setNewTicketPriority(e.target.value)}
                style={styles.select}
              >
                {ticketPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select
                value={newTicketEmployee}
                onChange={(e) => setNewTicketEmployee(e.target.value)}
                style={styles.select}
              >
                <option value="">Select requester</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
              <select
                value={newTicketAsset}
                onChange={(e) => setNewTicketAsset(e.target.value)}
                style={styles.select}
              >
                <option value="">Related asset (optional)</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_name}
                  </option>
                ))}
              </select>
              <textarea
                value={newTicketDescription}
                onChange={(e) => setNewTicketDescription(e.target.value)}
                placeholder="Describe the issue in detail"
                rows={6}
                style={styles.textarea}
              />
            </div>
            <button
              onClick={handleCreateTicket}
              style={styles.primaryButton}
              disabled={loading}
            >
              Create Ticket
            </button>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.filterRow}>
            <div style={styles.searchWrap}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets..."
                style={styles.searchInput}
              />
            </div>
            <select
              style={styles.select}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {ticketStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              style={styles.select}
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              {ticketPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.kanbanBoard}>
            {ticketStatuses.map((status) => (
              <div key={status} style={styles.kanbanColumn}>
                <h3>{status}</h3>
                {groupedTickets[status]?.length === 0 ? (
                  <div style={styles.emptyColumn}>No tickets</div>
                ) : (
                  groupedTickets[status].map((ticket) => (
                    <button
                      key={ticket.id}
                      style={styles.ticketCard}
                      onClick={() => handleSelectTicket(ticket.id)}
                    >
                      <div style={styles.ticketHeader}>
                        <span>{ticket.priority}</span>
                        <strong>{ticket.title}</strong>
                      </div>
                      <div style={styles.ticketMeta}>
                        <span>{ticket.category}</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTicket && (
        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <div>
              <h2>{selectedTicket.title}</h2>
              <p style={styles.subtitle}>{selectedTicket.description}</p>
            </div>
            <div style={styles.detailMeta}>
              <span>{`Requester: ${employees.find((employee) => employee.id === selectedTicket.employee_id)?.full_name || "Unknown"}`}</span>
              <span>{`Assigned: ${selectedTicketAssigneeName}`}</span>
            </div>
          </div>

          <div style={styles.detailBody}>
            <div style={styles.detailColumn}>
              <label style={styles.fieldLabel}>Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={styles.select}
              >
                {ticketStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <label style={styles.fieldLabel}>Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                style={styles.select}
              >
                {ticketPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>

              <label style={styles.fieldLabel}>Assign to</label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                style={styles.select}
              >
                <option value="">Unassigned</option>
                {staff.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleUpdateTicket}
                style={styles.primaryButton}
                disabled={loading}
              >
                Save Changes
              </button>
            </div>

            <div style={styles.commentPanel}>
              <h3>Comments</h3>
              <div style={styles.commentList}>
                {comments.length === 0 ? (
                  <div style={styles.emptyState}>No comments yet.</div>
                ) : (
                  comments.map((comment) => (
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
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment"
                rows={4}
                style={styles.textarea}
              />
              <button
                onClick={handleAddComment}
                style={styles.secondaryButton}
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  page: {
    padding: 30,
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  actionButton: {
    padding: "14px 20px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.8fr",
    gap: 20,
    marginBottom: 24,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    background: "white",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },
  formGrid: {
    display: "grid",
    gap: 14,
    marginTop: 14,
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
    fontSize: 14,
    background: "white",
  },
  textarea: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    resize: "vertical",
  },
  primaryButton: {
    marginTop: 8,
    padding: "14px 20px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryButton: {
    marginTop: 10,
    padding: "12px 18px",
    background: "#0f172a",
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  searchWrap: {
    flex: 1,
    minWidth: 200,
  },
  searchInput: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    fontSize: 14,
  },
  kanbanBoard: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(200px, 1fr))",
    gap: 18,
  },
  kanbanColumn: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 18,
    minHeight: 320,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  },
  emptyColumn: {
    color: "#64748b",
    marginTop: 12,
  },
  ticketCard: {
    width: "100%",
    border: "none",
    background: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    textAlign: "left",
    cursor: "pointer",
    marginBottom: 12,
  },
  ticketHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
    fontSize: 14,
    color: "#0f172a",
  },
  ticketMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#475569",
  },
  detailPanel: {
    background: "white",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "baseline",
    marginBottom: 24,
  },
  subtitle: {
    margin: 0,
    color: "#475569",
  },
  detailMeta: {
    display: "grid",
    gap: 8,
    textAlign: "right",
    color: "#334155",
  },
  detailBody: {
    display: "grid",
    gridTemplateColumns: "1fr 0.95fr",
    gap: 24,
  },
  detailColumn: {
    display: "grid",
    gap: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
    display: "block",
  },
  commentPanel: {
    display: "grid",
    gap: 14,
  },
  commentList: {
    maxHeight: 340,
    overflowY: "auto",
    display: "grid",
    gap: 12,
  },
  commentItem: {
    background: "#f8fafc",
    padding: 16,
    borderRadius: 16,
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 12,
    color: "#334155",
  },
  commentBody: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
  },
  emptyState: {
    color: "#64748b",
    padding: 20,
    textAlign: "center",
  },
};
