import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvoiceBuilder } from "../InvoiceBuilder";
import { Card, EmptyState } from "@/components/ui";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: products }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase
      .from("products")
      .select("id, name, default_sell_price")
      .order("name"),
  ]);

  return (
    <div className="max-w-4xl">
      <Link href="/invoices" className="text-sm text-slate-500 hover:underline">
        ← Back to invoices
      </Link>
      <h1 className="my-4 text-2xl font-semibold text-slate-900">
        New invoice
      </h1>

      {!clients || clients.length === 0 ? (
        <EmptyState message="Add a client first — invoices are billed to a client." />
      ) : (
        <Card>
          <InvoiceBuilder clients={clients} products={products ?? []} />
        </Card>
      )}
    </div>
  );
}
