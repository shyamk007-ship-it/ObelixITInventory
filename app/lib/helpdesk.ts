export const ticketCategories = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Security",
  "Other",
] as const;

export type TicketCategory = typeof ticketCategories[number];

export const ticketPriorities = ["Low", "Medium", "High", "Critical"] as const;
export type TicketPriority = typeof ticketPriorities[number];

export const ticketStatuses = [
  "Open",
  "In Progress",
  "Waiting",
  "Resolved",
  "Closed",
] as const;
export type TicketStatus = typeof ticketStatuses[number];

export const maintenanceStatuses = ["Pending", "In Progress", "Completed"] as const;
export type MaintenanceStatus = typeof maintenanceStatuses[number];

export const ticketNotificationActions = [
  "New Ticket",
  "Ticket Assigned",
  "Ticket Updated",
  "Ticket Resolved",
  "Ticket Closed",
  "Warranty Expiring",
  "Maintenance Due",
] as const;
