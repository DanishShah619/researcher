import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorVariant?: "sky" | "blue" | "emerald" | "amber" | "indigo";
}

const colorMap = {
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  colorVariant = "sky",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3.5">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[colorVariant]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-none mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}
