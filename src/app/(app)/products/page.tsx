import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n ?? 0);
}

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, category, default_cost_price, default_sell_price, billing_period_days",
    )
    .order("name");

  return (
    <div>
      <PageHeader
        title="Products"
        action={{ href: "/products/new", label: "Add product" }}
      />

      {!products || products.length === 0 ? (
        <EmptyState message="No products yet. Add the subscriptions you resell." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">Sell</th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
                <th className="px-4 py-3 text-right font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {money(p.default_cost_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {money(p.default_sell_price)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {money(p.default_sell_price - p.default_cost_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {p.billing_period_days}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
