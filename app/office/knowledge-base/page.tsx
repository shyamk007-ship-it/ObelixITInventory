import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficeKnowledgeBasePage() {
  return (
    <ModulePageShell
      title="Knowledge Base"
      description="Centralize IT runbooks, policy notes, troubleshooting steps, and standard operating procedures."
      highlights={["Runbooks", "Troubleshooting Articles", "Policy Library"]}
      primaryAction={{ label: "Open Tickets", href: "/office/tickets" }}
      secondaryAction={{ label: "Review Reports", href: "/office/reports" }}
    />
  );
}
