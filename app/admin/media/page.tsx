import { AdminMediaWorkspace } from "@/components/admin-media-workspace";
import { getMediaOutletsData } from "@/lib/supabase/data";

export default async function AdminMediaPage() {
  const data = await getMediaOutletsData();

  return <AdminMediaWorkspace initialData={data} />;
}
