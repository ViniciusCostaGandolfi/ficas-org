import { data, Link } from "react-router";

import { NotFoundContent } from "~/components/NotFoundContent";
import { EmptyState } from "~/components/EmptyState";
import { ArrowUpRightIcon } from "~/components/Icons";
import { ImageWithFallback } from "~/components/ImageWithFallback";
import { createApi } from "~/lib/api.server";
import { formatDate } from "~/lib/format";
import { renderContentHtml } from "~/lib/markdown";
import { ApiError, type PostDto } from "~/lib/types";

import type { Route } from "./+types/news-detail";

export async function loader({ params, request }: Route.LoaderArgs) {
  const api = createApi(request);
  try {
    const post = await api.get<PostDto>(
      `/api/public/posts/${encodeURIComponent(params.slug)}`,
    );
    return { post, unavailable: false as const };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw data("Post não encontrado", { status: 404 });
    }
    console.error("[news-detail] API unavailable:", error);
    return { post: null, unavailable: true as const };
  }
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => {
  if (loaderData?.unavailable) {
    return [
      { title: "Conteúdo indisponível — FICAS" },
      { name: "robots", content: "noindex" },
    ];
  }
  const post = loaderData?.post;
  if (!post) {
    return [{ title: "Notícia não encontrada — FICAS" }];
  }
  return [
    { title: post.seoTitle || `${post.title} — FICAS` },
    {
      name: "description",
      content: post.seoDescription || post.excerpt || "",
    },
    { property: "og:title", content: post.seoTitle || post.title },
    {
      property: "og:description",
      content: post.seoDescription || post.excerpt || "",
    },
    { property: "og:type", content: "article" },
  ];
};

export function ErrorBoundary() {
  return <NotFoundContent title="Notícia não encontrada" />;
}

export default function NewsDetail({ loaderData }: Route.ComponentProps) {
  const { post, unavailable } = loaderData;

  if (unavailable || !post) {
    return (
      <EmptyState
        title="Conteúdo indisponível"
        description="Não foi possível carregar esta notícia agora. Tente novamente em instantes."
      />
    );
  }

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="breadcrumbs text-sm text-base-content/60">
        <ul>
          <li>
            <Link to="/" className="link link-hover">
              Início
            </Link>
          </li>
          <li>
            <Link to="/noticias" className="link link-hover">
              Notícias
            </Link>
          </li>
          <li className="max-w-[16rem] truncate">{post.title}</li>
        </ul>
      </div>

      <header className="flex flex-col gap-4">
        {post.category ? (
          <Link
            to={`/categoria/${post.category.slug}`}
            className="w-fit rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/20"
          >
            {post.category.name}
          </Link>
        ) : null}
        <h1 className="display-tight text-3xl font-semibold sm:text-4xl lg:text-[2.75rem]">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/60">
          {post.author?.name ? (
            <span className="font-medium text-base-content/70">
              {post.author.name}
            </span>
          ) : null}
          {post.author?.name && post.publishedAt ? (
            <span aria-hidden="true">·</span>
          ) : null}
          {post.publishedAt ? (
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
          ) : null}
        </div>
      </header>

      <ImageWithFallback
        src={post.coverImageUrl}
        alt=""
        loading="eager"
        className="aspect-video w-full rounded-2xl border border-base-300 object-cover shadow-sm"
        fallback={null}
      />

      {post.excerpt ? (
        <p className="border-l-4 border-accent/60 pl-4 font-display text-xl leading-relaxed text-base-content/80">
          {post.excerpt}
        </p>
      ) : null}

      <div
        className="cms-content prose max-w-none"
        // Content is trusted markup produced by the CMS. MARKDOWN is rendered
        // to HTML here; HTML passes through unchanged.
        dangerouslySetInnerHTML={{
          __html: renderContentHtml(post.content, post.contentFormat),
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-6">
        <Link to="/noticias" className="btn btn-ghost btn-sm">
          ← Voltar para notícias
        </Link>
        {post.category ? (
          <Link
            to={`/categoria/${post.category.slug}`}
            className="link link-primary inline-flex items-center gap-1 text-sm font-medium"
          >
            Mais em {post.category.name}
            <ArrowUpRightIcon className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
