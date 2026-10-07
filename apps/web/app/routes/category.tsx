import { data, Link } from "react-router";

import { EmptyState } from "~/components/EmptyState";
import { NotFoundContent } from "~/components/NotFoundContent";
import { PageHeader } from "~/components/PageHeader";
import { Pagination } from "~/components/Pagination";
import { PostCard } from "~/components/PostCard";
import { createApi, withFallback } from "~/lib/api.server";
import {
  emptyPage,
  type CategoryDto,
  type Page,
  type PostSummaryDto,
} from "~/lib/types";

import type { Route } from "./+types/category";

const PAGE_SIZE = 9;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));

  const api = createApi(request);
  const [posts, categories] = await Promise.all([
    withFallback(
      () =>
        api.get<Page<PostSummaryDto>>(
          `/api/public/posts?page=${page}&size=${PAGE_SIZE}&category=${encodeURIComponent(params.slug)}`,
        ),
      emptyPage<PostSummaryDto>(PAGE_SIZE),
      "category-posts",
    ),
    withFallback(
      () => api.get<CategoryDto[]>("/api/public/categories"),
      [] as CategoryDto[],
      "category-list",
    ),
  ]);

  const category = categories.find((item) => item.slug === params.slug) ?? null;
  if (!category && categories.length > 0 && posts.totalElements === 0) {
    throw data("Categoria não encontrada", { status: 404 });
  }

  return { posts, category, slug: params.slug };
}

export const meta: Route.MetaFunction = ({ data: loaderData, params }) => {
  const name = loaderData?.category?.name ?? params.slug;
  const description =
    loaderData?.category?.description ||
    `Publicações da categoria ${name} na FICAS.`;
  return [
    { title: `${name} — FICAS` },
    { name: "description", content: description },
    { property: "og:title", content: `${name} — FICAS` },
    { property: "og:description", content: description },
  ];
};

export function ErrorBoundary() {
  return <NotFoundContent title="Categoria não encontrada" />;
}

export default function CategoryRoute({ loaderData }: Route.ComponentProps) {
  const { posts, category, slug } = loaderData;
  const title = category?.name ?? slug;

  return (
    <div className="flex flex-col gap-8">
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
          <li>{title}</li>
        </ul>
      </div>

      <PageHeader
        eyebrow="Categoria"
        title={title}
        lead={
          category?.description ??
          "Publicações relacionadas a este assunto."
        }
      />

      {posts.content.length > 0 ? (
        <>
          <p className="text-sm text-base-content/60">
            {posts.totalElements}{" "}
            {posts.totalElements === 1 ? "publicação" : "publicações"}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.content.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        </>
      ) : (
        <EmptyState
          title="Nenhuma publicação nesta categoria"
          description="Ainda não há conteúdos publicados aqui."
          action={
            <Link to="/noticias" className="btn btn-primary btn-sm">
              Ver todas as notícias
            </Link>
          }
        />
      )}
    </div>
  );
}
