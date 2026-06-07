import Link from "next/link";
import { createProductRecord } from "../actions";
import { ProductForm } from "../ProductForm";
import { Card } from "@/components/ui";

export default function NewProductPage() {
  return (
    <div className="max-w-lg">
      <Link href="/products" className="text-sm text-slate-500 hover:underline">
        ← Back to products
      </Link>
      <h1 className="my-4 text-2xl font-semibold text-slate-900">Add product</h1>
      <Card>
        <ProductForm action={createProductRecord} submitLabel="Create product" />
      </Card>
    </div>
  );
}
