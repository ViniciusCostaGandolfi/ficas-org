import type { PostStatus } from "~/lib/types";

const STATUS: Record<PostStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "badge-warning" },
  PUBLISHED: { label: "Publicado", className: "badge-success" },
  ARCHIVED: { label: "Arquivado", className: "badge-ghost" },
};

export interface StatusBadgeProps {
  status?: PostStatus | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const item = STATUS[status ?? "DRAFT"];
  return (
    <span className={`badge badge-sm whitespace-nowrap ${item.className}`}>
      {item.label}
    </span>
  );
}
