import { getAdminData } from "@/lib/supabase/data";
import { StatusManager } from "@/components/status-manager";
import { TypeManager } from "@/components/type-manager";

export default async function SettingsPage() {
  const { statuses, types } = await getAdminData();

  return (
    <main className="page-shell py-8">
      <div
        className="mb-6 rounded-[28px] border p-5 backdrop-blur-2xl sm:p-6"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-surface)",
          boxShadow: "var(--theme-shadow-lift)"
        }}
      >
        <div className="label">Settings</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--theme-text)" }}>
          Statuses and Types
        </h1>
      </div>

      <div className="grid gap-8">
        <StatusManager statuses={statuses} />
        <TypeManager types={types} />
      </div>
    </main>
  );
}
