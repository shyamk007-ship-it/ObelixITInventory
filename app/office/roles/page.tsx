import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficeRolesPage() {
  return (
    <ModulePageShell
      title="Roles"
      description="Define office role templates, policy access boundaries, and delegated authority models."
      highlights={["Role Templates", "Access Matrix", "Delegation Rules"]}
      primaryAction={{ label: "Open Users", href: "/office/users" }}
      secondaryAction={{ label: "Open Settings", href: "/office/settings" }}
    />
  );
}
