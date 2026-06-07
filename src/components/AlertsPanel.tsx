import Link from "next/link";
import type { Database } from "@/lib/database.types";

type Alert = Database["public"]["Views"]["v_expiring_subscriptions"]["Row"];

const bucketStyle: Record<Alert["bucket"], { label: string; cls: string }> = {
  overdue: { label: "Overdue", cls: "bg-red-100 text-red-700" },
  due_today: { label: "Due today", cls: "bg-amber-100 text-amber-700" },
  expiring_soon: { label: "Expiring soon", cls: "bg-yellow-100 text-yellow-700" },
};

function relative(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "today";
  return `in ${daysLeft}d`;
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Needs attention
        </h2>
        {alerts.length > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">
          Nothing expiring soon. You&apos;re all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {alerts.map((a) => {
            const b = bucketStyle[a.bucket];
            return (
              <li
                key={a.subscription_id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <Link
                    href={`/clients/${a.client_id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {a.client_name}
                  </Link>
                  <span className="text-slate-500">
                    {" "}
                    · {a.product_name ?? "subscription"}
                  </span>
                  <p className="text-xs text-slate-400">
                    Expires {a.expiry_date} ({relative(a.days_left)})
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}
                >
                  {b.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
