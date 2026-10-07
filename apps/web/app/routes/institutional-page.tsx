import { data, Link } from "react-router";

import { NotFoundContent } from "~/components/NotFoundContent";
import { EmptyState } from "~/components/EmptyState";
import { ImageWithFallback } from "~/components/ImageWithFallback";
import { PageHeader } from "~/components/PageHeader";
import { createApi } from "~/lib/api.server";
import { formatDate } from "~/lib/format";
import { renderContentHtml } from "~/lib/markdown";
import {
  findLegacyRedirect,
  legacyRedirectResponse,
} from "~/lib/redirects.server";
import { ApiError, type PageDto } from "~/lib/types";

import type { Route } from "./+types/institutional-page";

export async function loader({ params, request }: Route.LoaderArgs) {
  const api = createApi(request);
  try {
    const page = await api.get<PageDto>(
      `/api/public/pages/${encodeURIComponent(params.slug)}`,
    );
    return { page, unavailable: false as const };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // Single-segment legacy URLs (e.g. `/ultimas-noticias/`) resolve to this
      // route, not the `*` catch-all, so check the redirect table here too.
      const match = await findLegacyRedirect(request);
      if (match) {
        throw legacyRedirectResponse(match);
      }
      throw data("Página não encontrada", { status: 404 });
    }
    console.error("[institutional-page] API unavailable:", error);
    return { page: null, unavailable: true as const };
  }
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => {
  if (loaderData?.unavailable) {
    return [
      { title: "Conteúdo indisponível — FICAS" },
      { name: "robots", content: "noindex" },
    ];
  }
  const page = loaderData?.page;
  if (!page) {
    return [
      { title: "Página não encontrada — FICAS" },
      { name: "robots", content: "noindex" },
    ];
  }
  return [
    { title: page.seoTitle || `${page.title} — FICAS` },
    {
      name: "description",
      content: page.seoDescription || page.excerpt || "",
    },
    { property: "og:title", content: page.seoTitle || page.title },
    {
      property: "og:description",
      content: page.seoDescription || page.excerpt || "",
    },
  ];
};

export function ErrorBoundary() {
  return <NotFoundContent />;
}

export default function InstitutionalPage({ loaderData }: Route.ComponentProps) {
  const { page, unavailable } = loaderData;

  if (unavailable || !page) {
    return (
      <EmptyState
        title="Conteúdo indisponível"
        description="Não foi possível carregar esta página agora. Tente novamente em instantes."
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
          <li className="max-w-[16rem] truncate">{page.title}</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <PageHeader
          eyebrow="Institucional"
          title={page.title}
          lead={page.excerpt || undefined}
        />
        {page.updatedAt ? (
          <p className="text-sm text-base-content/55">
            Atualizado em {formatDate(page.updatedAt)}
          </p>
        ) : null}
      </div>

      <ImageWithFallback
        src={page.heroImageUrl}
        alt=""
        loading="eager"
        className="w-full rounded-2xl border border-base-300 object-cover shadow-sm"
        fallback={null}
      />

      <div
        className="cms-content prose max-w-none"
        dangerouslySetInnerHTML={{
          __html: renderContentHtml(page.content, page.contentFormat),
        }}
      />
    </article>
  );
}
