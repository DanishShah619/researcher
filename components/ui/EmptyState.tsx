import React from "react";
import Link from "next/link";
import { HelpCircle, ArrowLeft } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function EmptyState({
  title,
  description,
  actionText = "Return Home",
  actionHref = "/",
  icon: Icon = HelpCircle,
}: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      {actionHref && (
        <div className="pt-2">
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {actionText}
          </Link>
        </div>
      )}
    </div>
  );
}
