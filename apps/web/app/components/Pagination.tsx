import { Link, useLocation, useSearchParams } from "react-router";

import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

export interface PaginationProps {
  page: number;
  totalPages: number;
  className?: string;
}

type PageItem = number | "gap";

function pageWindow(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index);
  }
  const items: PageItem[] = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) items.push("gap");
  for (let index = start; index <= end; index += 1) items.push(index);
  if (end < total - 2) items.push("gap");
  items.push(total - 1);
  return items;
}

export function Pagination({ page, totalPages, className = "" }: PaginationProps) {
  const location = useLocation();
  const [params] = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `${location.pathname}?${next.toString()}`;
  };

  const items = pageWindow(page, totalPages);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <nav aria-label="Paginação" className={`flex justify-center ${className}`}>
      <div className="join">
        {hasPrev ? (
          <Link
            to={hrefFor(page - 1)}
            className="join-item btn"
            aria-label="Página anterior"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
        ) : (
          <button className="join-item btn btn-disabled" disabled aria-label="Página anterior">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        )}

        {items.map((item, index) =>
          item === "gap" ? (
            <button
              key={`gap-${index}`}
              className="join-item btn btn-disabled"
              disabled
              aria-hidden="true"
            >
              …
            </button>
          ) : (
            <Link
              key={item}
              to={hrefFor(item)}
              aria-current={item === page ? "page" : undefined}
              className={`join-item btn ${item === page ? "btn-active btn-primary" : ""}`}
            >
              {item + 1}
            </Link>
          ),
        )}

        {hasNext ? (
          <Link
            to={hrefFor(page + 1)}
            className="join-item btn"
            aria-label="Próxima página"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        ) : (
          <button className="join-item btn btn-disabled" disabled aria-label="Próxima página">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
