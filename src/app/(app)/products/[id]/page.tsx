import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProductRecord, deleteProductRecord } from "../actions";
import { ProductForm } from "../ProductForm";
import { Card } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, category, default_cost_price, default_sell_price, billing_period_days",
    )
    .eq("id", id)
    .single();

  if (!product) notFound();

  const update = updateProductRecord.bind(null, id);
  const remove = deleteProductRecord.bind(null, id);

  return (
    <div className="max-w-lg">
      <Link href="/products" className="text-sm text-slate-500 hover:underline">
        ← Back to products
      </Link>
      <h1 className="my-4 text-2xl font-semibold text-slate-900">
        Edit product
      </h1>
      <Card>
        <ProductForm
          action={update}
          initial={product}
          submitLabel="Save changes"
        />
      </Card>

      <div className="mt-6">
        <DeleteButton
          action={remove}
          label="Delete product"
          confirmMessage="Delete this product? Existing subscriptions keep their snapshotted prices."
        />
      </div>
    </div>
  );
}
