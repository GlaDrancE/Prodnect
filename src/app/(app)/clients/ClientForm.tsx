"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, inputClass } from "@/components/ui";

type Action = (
  prev: unknown,
  formData: FormData,
) => Promise<{ error: string | null }>;

export type ClientInitial = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export function ClientForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: ClientInitial;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name">
        <input
          name="name"
          defaultValue={initial?.name ?? ""}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Email">
        <input
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Phone">
        <input
          name="phone"
          defaultValue={initial?.phone ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className={inputClass}
        />
      </Field>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
