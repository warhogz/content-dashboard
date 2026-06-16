import { PublicPlanWorkspace } from "@/components/public-plan-workspace";
import { getPublicPlannerData } from "@/lib/supabase/planner-data";
import { EmptyState } from "@/components/empty-state";

export default async function PlanRoutePage() {
  const planner = await getPublicPlannerData();

  return (
    <main className="page-shell py-6 sm:py-8">
      {planner.weeks.length ? (
        <PublicPlanWorkspace weeks={planner.weeks} />
      ) : (
        <EmptyState title="Plan is empty" description="No weeks have been assembled in the planner yet." />
      )}
    </main>
  );
}
