import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Consistent editorial header for public inner pages. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-wrap items-end justify-between gap-6 ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-3xl font-semibold text-base-content sm:text-4xl">
          {title}
        </h1>
        {lead ? (
          <p className="mt-3 text-base-content/75">{lead}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
