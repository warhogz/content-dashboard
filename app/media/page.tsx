import { MediaDashboard } from "@/components/media-dashboard";
import { getMediaOutletsData } from "@/lib/supabase/data";

export default async function MediaPage() {
  const { outlets } = await getMediaOutletsData();

  return (
    <main className="page-shell py-6 sm:py-8">
      <MediaDashboard outlets={outlets} />
    </main>
  );
}
