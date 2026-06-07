"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, inputClass, selectClass } from "@/components/ui";

type Action = (
  prev: unknown,
  formData: FormData,
) => Promise<{ error: string | null }>;

export type ProductInitial = {
  name?: string;
  category?: string | null;
  default_cost_price?: number;
  default_sell_price?: number;
  billing_period_days?: number;
};

// Curated catalog grouped by category. The optgroup label doubles as the
// `category` value saved alongside the product.
const PRODUCT_GROUPS: { category: string; label: string; names: string[] }[] = [
  {
    category: "streaming",
    label: "Streaming",
    names: [
      "Netflix",
      "Amazon Prime",
      "Disney+ Hotstar",
      "YouTube Premium",
      "Spotify",
      "Apple TV+",
      "HBO Max",
    ],
  },
  {
    category: "llm",
    label: "AI & LLM",
    names: [
      "ChatGPT Plus",
      "Claude Pro",
      "Google Gemini Advanced",
      "Perplexity Pro",
      "GitHub Copilot",
      "Microsoft Copilot Pro",
    ],
  },
  {
    category: "video-generation",
    label: "Video Generation",
    names: [
      "Runway",
      "Sora",
      "Pika",
      "Kling AI",
      "Luma Dream Machine",
      "Synthesia",
      "HeyGen",
    ],
  },
];

const ALL_NAMES = PRODUCT_GROUPS.flatMap((g) => g.names);

const BILLING_OPTIONS = [
  { label: "1 month", value: 30 },
  { label: "3 months", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 },
];

export function ProductForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: ProductInitial;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, { error: null });

  // Editing a product whose name isn't in the curated list (e.g. a custom one
  // created earlier) — keep it selectable so the value is preserved on save.
  const initialName = initial?.name ?? "";
  const hasCustomName = initialName !== "" && !ALL_NAMES.includes(initialName);

  const initialBilling = initial?.billing_period_days ?? 30;
  const hasCustomBilling = !BILLING_OPTIONS.some((o) => o.value === initialBilling);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name">
        <select
          name="name"
          defaultValue={initialName}
          required
          className={selectClass}
        >
          <option value="" disabled>
            Select a product…
          </option>
          {hasCustomName && <option value={initialName}>{initialName}</option>}
          {PRODUCT_GROUPS.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {group.names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Category">
        <input
          name="category"
          placeholder="streaming, software…"
          defaultValue={initial?.category ?? ""}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Default cost price">
          <input
            name="default_cost_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.default_cost_price ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Default sell price">
          <input
            name="default_sell_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.default_sell_price ?? 0}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Billing period">
        <select
          name="billing_period_days"
          defaultValue={initialBilling}
          className={selectClass}
        >
          {hasCustomBilling && (
            <option value={initialBilling}>{initialBilling} days</option>
          )}
          {BILLING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
