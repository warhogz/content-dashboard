import { getAdminData } from "@/lib/supabase/data";
import { AdminWorkspace } from "@/components/admin-workspace";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const data = await getAdminData();
  if (!data) redirect("/login");
  return <AdminWorkspace initialData={data} />;
}
