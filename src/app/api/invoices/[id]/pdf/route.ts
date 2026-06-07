import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDocument, type InvoicePdfData } from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  number: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  clients: { name: string; email: string | null; phone: string | null } | null;
  workspaces: { name: string } | null;
  invoice_items: {
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Authenticated server client — RLS ensures only the owner sees their invoice.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "number, issue_date, due_date, status, currency, subtotal, tax, total, clients(name,email,phone), workspaces(name), invoice_items(description, quantity, unit_price, line_total)",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = data as unknown as Row;

  const pdfData: InvoicePdfData = {
    number: row.number,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    status: row.status,
    currency: row.currency,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    workspaceName: row.workspaces?.name ?? "Your Company",
    client: {
      name: row.clients?.name ?? "Client",
      email: row.clients?.email ?? null,
      phone: row.clients?.phone ?? null,
    },
    items: (row.invoice_items ?? []).map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      lineTotal: it.line_total,
    })),
  };

  const buffer = await renderToBuffer(
    createElement(InvoiceDocument, { data: pdfData }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${row.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
