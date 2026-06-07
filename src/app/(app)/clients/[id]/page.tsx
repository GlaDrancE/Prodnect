import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateClientRecord, deleteClientRecord } from "../actions";
import { ClientForm } from "../ClientForm";
import { Card } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, phone, notes")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const update = updateClientRecord.bind(null, id);
  const remove = deleteClientRecord.bind(null, id);

  return (
    <div className="max-w-lg">
      <Link href="/clients" className="text-sm text-slate-500 hover:underline">
        ← Back to clients
      </Link>
      <h1 className="my-4 text-2xl font-semibold text-slate-900">
        Edit client
      </h1>
      <Card>
        <ClientForm
          action={update}
          initial={client}
          submitLabel="Save changes"
        />
      </Card>

      <div className="mt-6">
        <DeleteButton action={remove} label="Delete client" />
      </div>
    </div>
  );
}
