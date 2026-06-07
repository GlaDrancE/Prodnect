"use client";

import { useMemo, useState, useTransition } from "react";
import { createInvoice } from "./actions";
import { inputClass, labelClass } from "@/components/ui";

type Client = { id: string; name: string };
type Product = { id: string; name: string; default_sell_price: number };

type Line = {
  key: string;
  productId: string;
  description: string;
  quantity: number;
  unit_price: number;
};

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n || 0);
}

function blankLine(): Line {
  return {
    key: crypto.randomUUID(),
    productId: "",
    description: "",
    quantity: 1,
    unit_price: 0,
  };
}

export function InvoiceBuilder({
  clients,
  products,
}: {
  clients: Client[];
  products: Product[];
}) {
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tax, setTax] = useState(0);
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    [lines],
  );
  const total = subtotal + (Number(tax) || 0);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function onPickProduct(key: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateLine(key, {
      productId,
      description: p ? p.name : "",
      unit_price: p ? p.default_sell_price : 0,
    });
  }

  function submit() {
    setError(null);
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    const cleaned = lines.filter((l) => l.description.trim() !== "");
    if (cleaned.length === 0) {
      setError("Add at least one line item with a description.");
      return;
    }
    startTransition(async () => {
      const res = await createInvoice({
        client_id: clientId,
        due_date: dueDate || null,
        tax: Number(tax) || 0,
        items: cleaned.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          subscription_id: null,
        })),
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Due date (optional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass + " mb-0"}>Line items</label>
          <button
            type="button"
            onClick={() => setLines((p) => [...p, blankLine()])}
            className="text-sm font-medium text-brand hover:underline"
          >
            + Add line
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="w-20 px-3 py-2 text-right font-medium">Qty</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Price</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <select
                      value={l.productId}
                      onChange={(e) => onPickProduct(l.key, e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Custom…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={l.description}
                      onChange={(e) =>
                        updateLine(l.key, { description: e.target.value })
                      }
                      placeholder="Item description"
                      className={inputClass}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) =>
                        updateLine(l.key, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className={inputClass + " text-right"}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.unit_price}
                      onChange={(e) =>
                        updateLine(l.key, {
                          unit_price: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={inputClass + " text-right"}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {money(l.quantity * l.unit_price)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setLines((p) => p.filter((x) => x.key !== l.key))
                        }
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remove line"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <label htmlFor="tax">Tax</label>
            <input
              id="tax"
              type="number"
              min={0}
              step="0.01"
              value={tax}
              onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
              className={inputClass + " w-28 text-right"}
            />
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create invoice"}
        </button>
      </div>
    </div>
  );
}
