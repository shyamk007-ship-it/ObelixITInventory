import ModulePageShell from "../../components/office/ModulePageShell";

export default function OfficePurchaseRequestsPage() {
  return (
    <ModulePageShell
      title="Purchase Requests"
      description="Submit, review, and approve procurement requests with budget and vendor checkpoints."
      highlights={["Request Queue", "Approval Routing", "Cost Controls"]}
      primaryAction={{ label: "Open Purchase Orders", href: "/office/purchase-orders" }}
      secondaryAction={{ label: "View Vendors", href: "/office/vendors" }}
    />
  );
}
