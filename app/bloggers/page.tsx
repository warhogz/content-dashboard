import { BloggersDashboard } from "@/components/bloggers-dashboard";
import { getBloggersData } from "@/lib/supabase/data";

export default async function BloggersPage() {
  const { bloggers } = await getBloggersData();

  return (
    <main className="page-shell py-6 sm:py-8">
      <BloggersDashboard bloggers={bloggers} />
    </main>
  );
}
