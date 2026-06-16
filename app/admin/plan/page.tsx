import { redirect } from "next/navigation";
import { AdminPlanWorkspace } from "@/components/admin-plan-workspace";
import { getAdminPlannerData } from "@/lib/supabase/planner-data";

export default async function AdminPlanPage() {
  const data = await getAdminPlannerData();
  if (!data) redirect("/login");
  return <AdminPlanWorkspace initialData={data} />;
}
