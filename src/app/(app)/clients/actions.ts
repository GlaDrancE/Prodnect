"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";

const clientSchema = z.object({

  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

function parse(formData: FormData) {
  return clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createClientRecord(_prev: unknown, formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const workspace_id = await getWorkspaceId();
  const { name, email, phone, notes } = parsed.data;

  const { error } = await supabase.from("clients").insert({
    workspace_id,
    name,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientRecord(
  id: string,
  _prev: unknown,
  formData: FormData,
) {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { name, email, phone, notes } = parsed.data;

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/clients");
  redirect("/clients");
}
