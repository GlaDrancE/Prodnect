import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n ?? 0);
}

export default async function ClientsPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: totals }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, email, phone")
      .order("created_at", { ascending: false }),
    supabase
      .from("v_client_totals")
      .select("client_id, active_subscriptions, revenue"),
  ]);

  const totalsById = new Map(
    (totals ?? []).map((t) => [t.client_id, t]),
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        action={{ href: "/clients/new", label: "Add client" }}
      />

      {!clients || clients.length === 0 ? (
        <EmptyState message="No clients yet. Add your first client to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const t = totalsById.get(c.id);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {t?.active_subscriptions ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {money(t?.revenue ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
