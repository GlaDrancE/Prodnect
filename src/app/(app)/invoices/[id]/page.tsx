import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateInvoiceStatus, deleteInvoice } from "../actions";
import { DeleteButton } from "@/components/DeleteButton";

function money(n: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    n ?? 0,
  );
}

const statusStyle: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, number, issue_date, due_date, status, currency, subtotal, tax, total, clients(name,email,phone), invoice_items(id, description, quantity, unit_price, line_total)",
    )
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const client = invoice.clients as {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  const items = (invoice.invoice_items ?? []) as {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  const currency = invoice.currency;

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/invoices"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Back to invoices
        </Link>
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Download PDF
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {invoice.number}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Issued {invoice.issue_date}
              {invoice.due_date ? ` · Due ${invoice.due_date}` : ""}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusStyle[invoice.status] ?? statusStyle.draft
            }`}
          >
            {invoice.status}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Billed to
          </p>
          <p className="mt-1 font-medium text-slate-900">{client?.name}</p>
          {client?.email && (
            <p className="text-sm text-slate-500">{client.email}</p>
          )}
          {client?.phone && (
            <p className="text-sm text-slate-500">{client.phone}</p>
          )}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Unit price</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{it.description}</td>
                <td className="py-2 text-right text-slate-600">
                  {it.quantity}
                </td>
                <td className="py-2 text-right text-slate-600">
                  {money(it.unit_price, currency)}
                </td>
                <td className="py-2 text-right text-slate-700">
                  {money(it.line_total, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{money(invoice.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>{money(invoice.tax, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>{money(invoice.total, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2">
          <form action={updateInvoiceStatus.bind(null, invoice.id, "sent")}>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Mark sent
            </button>
          </form>
          <form action={updateInvoiceStatus.bind(null, invoice.id, "paid")}>
            <button className="rounded-md border border-green-300 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50">
              Mark paid
            </button>
          </form>
        </div>
        <DeleteButton
          action={deleteInvoice.bind(null, invoice.id)}
          label="Delete invoice"
          confirmMessage="Delete this invoice? This cannot be undone."
        />
      </div>
    </div>
  );
}
