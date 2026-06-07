import Link from "next/link";
import { createClientRecord } from "../actions";
import { ClientForm } from "../ClientForm";
import { Card } from "@/components/ui";

export default function NewClientPage() {
  return (
    <div className="max-w-lg">
      <Link href="/clients" className="text-sm text-slate-500 hover:underline">
        ← Back to clients
      </Link>
      <h1 className="my-4 text-2xl font-semibold text-slate-900">Add client</h1>
      <Card>
        <ClientForm action={createClientRecord} submitLabel="Create client" />
      </Card>
    </div>
  );
}
