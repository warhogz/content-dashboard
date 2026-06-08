import { redirect } from "next/navigation";
import { AdminBloggersWorkspace } from "@/components/admin-bloggers-workspace";
import { getAdminBloggersData } from "@/lib/supabase/data";

export default async function AdminBloggersPage() {
  const data = await getAdminBloggersData();
  if (!data) redirect("/login");

  return <AdminBloggersWorkspace initialData={data} />;
}
