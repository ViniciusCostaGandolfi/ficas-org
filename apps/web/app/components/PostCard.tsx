import { Link } from "react-router";

import { formatDate } from "~/lib/format";
import { resolveMediaUrl } from "~/lib/media";
import type { PostSummaryDto } from "~/lib/types";

import { ArrowUpRightIcon } from "./Icons";
import { ImageWithFallback } from "./ImageWithFallback";

export interface PostCardProps {
  post: PostSummaryDto;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="card group h-full overflow-hidden border border-base-300 bg-base-100 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
      <Link to={`/noticias/${post.slug}`} className="flex h-full flex-col">
        <figure className="relative aspect-video overflow-hidden bg-base-200">
          <ImageWithFallback
            src={resolveMediaUrl(post.coverImageUrl)}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {post.category ? (
            <span className="absolute left-3 top-3 rounded-full bg-base-100/90 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              {post.category.name}
            </span>
          ) : null}
        </figure>
        <div className="card-body grow gap-3">
          <h3 className="card-title font-display text-lg leading-snug transition-colors group-hover:text-primary">
            {post.title}
          </h3>
          {post.excerpt ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-base-content/70">
              {post.excerpt}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-base-200 pt-3 text-xs text-base-content/60">
            <time dateTime={post.publishedAt ?? undefined}>
              {formatDate(post.publishedAt)}
            </time>
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              Ler mais
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
