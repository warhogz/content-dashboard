import { PlanPage } from "@/components/plan-page";
import { getPlanCardsData } from "@/lib/supabase/plan-data";

export default async function PlanRoutePage() {
  const { cards } = await getPlanCardsData();

  return (
    <main className="page-shell py-6 sm:py-8">
      <PlanPage cards={cards} />
    </main>
  );
}
