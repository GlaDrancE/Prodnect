import { createClient } from "@/lib/supabase/server";
import { AlertsPanel } from "@/components/AlertsPanel";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n ?? 0);
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: summary }, { data: alerts }] = await Promise.all([
    supabase.from("v_workspace_summary").select("*").single(),
    supabase.from("v_expiring_subscriptions").select("*"),
  ]);

  const s = summary ?? {
    total_clients: 0,
    active_subscriptions: 0,
    expiring_within_7d: 0,
    overdue: 0,
    total_revenue: 0,
    total_profit: 0,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Clients" value={s.total_clients} />
        <Stat label="Active subscriptions" value={s.active_subscriptions} />
        <Stat
          label="Expiring in 7 days"
          value={s.expiring_within_7d}
          accent="text-amber-600"
        />
        <Stat label="Overdue" value={s.overdue} accent="text-red-600" />
        <Stat label="Active revenue" value={money(s.total_revenue)} />
        <Stat
          label="Active profit"
          value={money(s.total_profit)}
          accent="text-green-600"
        />
      </div>

      <div className="mt-8">
        <AlertsPanel alerts={alerts ?? []} />
      </div>
    </div>
  );
}
