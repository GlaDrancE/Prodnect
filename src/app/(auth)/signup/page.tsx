"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Your name
        </label>
        <input name="fullName" type="text" required className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Workspace / business name
        </label>
        <input
          name="workspaceName"
          type="text"
          required
          className={inputClass}
        />
      </div>
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
          minLength={8}
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}

      <SubmitButton>Create account</SubmitButton>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand">
          Sign in
        </Link>
      </p>
    </form>
  );
}
