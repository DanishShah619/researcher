import React from "react";
import { Card } from "./Card";

interface PageSkeletonProps {
  variant: "dashboard" | "detail" | "topics";
  label: string;
}

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

function GraphPlaceholder() {
  return (
    <Card className="h-[420px] flex items-center justify-center">
      <div className="h-24 w-24 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800" />
    </Card>
  );
}

function ListPlaceholder({ rows }: { rows: number }) {
  return (
    <Card className="space-y-4">
      <Bar className="h-4 w-40" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-3.5 w-full" />
          <Bar className="h-3 w-2/3" />
        </div>
      ))}
    </Card>
  );
}

/**
 * Route-level loading placeholder shown while server components query CognoDB.
 * Mirrors the outer layout of each page so content doesn't jump when it arrives.
 */
export default function PageSkeleton({ variant, label }: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse"
    >
      <span className="sr-only">{label}</span>

      {variant === "dashboard" && (
        <>
          <div className="space-y-4 py-6">
            <Bar className="h-9 w-2/3 max-w-xl" />
            <Bar className="h-4 w-1/2 max-w-md" />
            <Bar className="h-12 w-full max-w-2xl rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="space-y-3">
                <Bar className="h-3 w-16" />
                <Bar className="h-7 w-12" />
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ListPlaceholder rows={4} />
            <ListPlaceholder rows={4} />
          </div>
        </>
      )}

      {variant === "detail" && (
        <>
          <Bar className="h-4 w-44" />
          <Card className="space-y-4">
            <div className="flex gap-2">
              <Bar className="h-6 w-14" />
              <Bar className="h-6 w-24" />
            </div>
            <Bar className="h-7 w-3/4" />
            <Bar className="h-4 w-1/2" />
            <div className="space-y-2 pt-3">
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-5/6" />
            </div>
          </Card>
          <GraphPlaceholder />
          <div className="grid gap-6 lg:grid-cols-2">
            <ListPlaceholder rows={3} />
            <ListPlaceholder rows={3} />
          </div>
        </>
      )}

      {variant === "topics" && (
        <>
          <div className="rounded-3xl border border-slate-200 p-6 sm:p-8 dark:border-slate-800 space-y-3">
            <Bar className="h-6 w-48 rounded-full" />
            <Bar className="h-9 w-2/3 max-w-xl" />
            <Bar className="h-4 w-1/2 max-w-lg" />
          </div>
          <Card className="space-y-4">
            <Bar className="h-4 w-56" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Bar key={i} className="h-8 w-28 rounded-xl" />
              ))}
            </div>
          </Card>
          <GraphPlaceholder />
        </>
      )}
    </div>
  );
}
