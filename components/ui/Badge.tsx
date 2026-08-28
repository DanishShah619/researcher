import React from "react";
import { FileText, User, Lightbulb, Building2 } from "lucide-react";

export type BadgeVariant = "paper" | "author" | "concept" | "venue" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  count?: number;
  showIcon?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  paper: {
    bg: "bg-sky-50 dark:bg-sky-950/60",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-900/50",
    icon: FileText,
  },
  author: {
    bg: "bg-blue-50 dark:bg-blue-950/60",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-900/50",
    icon: User,
  },
  concept: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900/50",
    icon: Lightbulb,
  },
  venue: {
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-900/50",
    icon: Building2,
  },
  neutral: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    icon: FileText,
  },
};

export default function Badge({
  variant = "neutral",
  label,
  count,
  showIcon = true,
  className = "",
}: BadgeProps) {
  const config = variantStyles[variant] || variantStyles.neutral;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" />}
      <span className="truncate">{label}</span>
      {typeof count === "number" && (
        <span className="ml-1 rounded-full bg-black/5 px-1.5 py-0.2 text-[10px] font-bold dark:bg-white/10">
          {count}
        </span>
      )}
    </span>
  );
}
