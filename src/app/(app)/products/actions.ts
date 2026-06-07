"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";

const num = z.coerce.number().min(0, "Must be 0 or more");

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  default_cost_price: num,
  default_sell_price: num,
  billing_period_days: z.coerce.number().int().min(1, "Must be at least 1 day"),
});

function parse(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") ?? "",
    default_cost_price: formData.get("default_cost_price") ?? 0,
    default_sell_price: formData.get("default_sell_price") ?? 0,
    billing_period_days: formData.get("billing_period_days") ?? 30,
  });
}

export async function createProductRecord(_prev: unknown, formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const workspace_id = await getWorkspaceId();
  const d = parsed.data;

  const { error } = await supabase.from("products").insert({
    workspace_id,
    name: d.name,
    category: d.category || null,
    default_cost_price: d.default_cost_price,
    default_sell_price: d.default_sell_price,
    billing_period_days: d.billing_period_days,
  });
  if (error) return { error: error.message };

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductRecord(
  id: string,
  _prev: unknown,
  formData: FormData,
) {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from("products")
    .update({
      name: d.name,
      category: d.category || null,
      default_cost_price: d.default_cost_price,
      default_sell_price: d.default_sell_price,
      billing_period_days: d.billing_period_days,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProductRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/products");
  redirect("/products");
}
