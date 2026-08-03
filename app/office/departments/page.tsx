import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficeDepartmentsPage() {
  return (
    <ModulePageShell
      title="Departments"
      description="Define organizational departments, ownership boundaries, and approval flows for office assets and requests."
      highlights={["Department Directory", "Ownership Matrix", "Budget Controls"]}
      primaryAction={{ label: "Open Settings", href: "/office/settings" }}
      secondaryAction={{ label: "View Employees", href: "/office/employees" }}
    />
  );
}