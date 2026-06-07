"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export default function LoginPage() {
  const [state, formAction] = useActionState(login, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <SubmitButton>Sign in</SubmitButton>

      <p className="text-center text-sm text-slate-500">
        No account?{" "}
        <Link href="/signup" className="font-medium text-brand">
          Create one
        </Link>
      </p>
    </form>
  );
}
