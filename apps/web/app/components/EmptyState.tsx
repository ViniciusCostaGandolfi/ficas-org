import type { ReactNode } from "react";

import { InboxIcon } from "./Icons";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-base-300 bg-base-200/40 px-6 py-14 text-center ${className}`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-base-200 text-base-content/40">
        {icon ?? <InboxIcon className="h-7 w-7" />}
      </span>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-base-content/60">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
