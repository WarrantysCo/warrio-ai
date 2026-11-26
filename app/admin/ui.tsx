import type { ReactNode } from "react";

// Small shared pieces so every admin page looks the same.

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  plain: "border-slate-200 bg-white",
  info: "border-sky-200 bg-sky-50",
  good: "border-emerald-200 bg-emerald-50",
  warn: "border-amber-300 bg-amber-50",
  bad: "border-red-300 bg-red-50",
};

export function StatTile({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: number | string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${TONES[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}
