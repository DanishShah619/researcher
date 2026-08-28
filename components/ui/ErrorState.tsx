import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  retryHref?: string;
}

export default function ErrorState({
  title = "Database Connection Error",
  message,
  retryHref,
}: ErrorStateProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/40 space-y-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-rose-950 dark:text-rose-200">{title}</h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-mono">
          {message}
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return Home
        </Link>
        {retryHref && (
          <Link
            href={retryHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Link>
        )}
      </div>
    </div>
  );
}
