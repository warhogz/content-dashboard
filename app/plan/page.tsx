import { PlanPage as LegacyPlanPage } from "@/components/plan-page";
import { PublicPlanWorkspace } from "@/components/public-plan-workspace";
import { getPlanCardsData } from "@/lib/supabase/plan-data";
import { getPublicPlannerData } from "@/lib/supabase/planner-data";

export default async function PlanRoutePage() {
  const planner = await getPublicPlannerData();

  if (planner.weeks.length) {
    return (
      <main className="page-shell py-6 sm:py-8">
        <PublicPlanWorkspace weeks={planner.weeks} />
      </main>
    );
  }

  const { cards } = await getPlanCardsData();

  return (
    <main className="page-shell py-6 sm:py-8">
      <LegacyPlanPage cards={cards} />
    </main>
  );
}
