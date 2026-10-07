import type { ReactNode } from "react";

export interface AdminPageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

/** Consistent page header for every admin screen. */
export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb ? (
          <div className="mb-1 text-xs font-medium text-base-content/50">
            {breadcrumb}
          </div>
        ) : null}
        <h1 className="font-display text-2xl font-semibold text-base-content sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-base-content/60">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
