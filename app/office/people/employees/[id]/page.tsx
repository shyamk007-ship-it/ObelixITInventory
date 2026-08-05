import { redirect } from "next/navigation";

export default async function PeopleEmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/office/employees/${id}`);
}
