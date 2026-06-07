"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import type { InvoiceStatus } from "@/lib/database.types";

const itemSchema = z.object({
  description: z.string().min(1, "Each line needs a description"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Price must be 0 or more"),
  subscription_id: z.string().uuid().nullable().optional(),
});

const invoiceSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  due_date: z.string().optional().nullable(),
  tax: z.coerce.number().min(0).default(0),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
});

export type InvoicePayload = z.input<typeof invoiceSchema>;

export async function createInvoice(payload: InvoicePayload) {
  const parsed = invoiceSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { client_id, due_date, tax, items } = parsed.data;

  const supabase = await createClient();
  const workspace_id = await getWorkspaceId();

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const total = subtotal + tax;

  // Per-workspace sequential number (INV-YYYY-0001).
  const { data: number, error: numErr } = await supabase.rpc(
    "next_invoice_number",
  );
  if (numErr || !number) {
    return { error: numErr?.message ?? "Could not generate invoice number" };
  }

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      workspace_id,
      client_id,
      number,
      due_date: due_date || null,
      status: "draft",
      subtotal,
      tax,
      total,
    })
    .select("id")
    .single();

  if (invErr || !invoice) {
    return { error: invErr?.message ?? "Could not create invoice" };
  }

  const { error: itemsErr } = await supabase.from("invoice_items").insert(
    items.map((it) => ({
      workspace_id,
      invoice_id: invoice.id,
      subscription_id: it.subscription_id ?? null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
  );

  if (itemsErr) {
    // Roll back the header so we don't leave an empty invoice behind.
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return { error: itemsErr.message };
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/invoices");
  redirect("/invoices");
}
