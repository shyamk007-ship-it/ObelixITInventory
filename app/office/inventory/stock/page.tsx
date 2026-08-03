import ModulePageShell from "../../../components/office/ModulePageShell";

export default function OfficeInventoryStockPage() {
  return (
    <ModulePageShell
      title="Inventory Stock"
      description="Monitor available stock levels, reorder points, and receiving throughput for office supplies and hardware."
      highlights={["Stock Overview", "Reorder Alerts", "Receiving Trends"]}
      primaryAction={{ label: "Open Assets", href: "/office/assets" }}
      secondaryAction={{ label: "View Reports", href: "/office/reports" }}
    />
  );
}
