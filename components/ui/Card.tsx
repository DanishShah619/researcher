import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />}
          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">
            {title}
          </h3>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
