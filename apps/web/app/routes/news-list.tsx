import { Form, Link } from "react-router";

import { EmptyState } from "~/components/EmptyState";
import { SearchIcon } from "~/components/Icons";
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

import type { Route } from "./+types/news-list";

const PAGE_SIZE = 9;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";

  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  });
  if (q) params.set("q", q);
  if (category) params.set("category", category);

  const api = createApi(request);
  const [posts, categories] = await Promise.all([
    withFallback(
      () =>
        api.get<Page<PostSummaryDto>>(
          `/api/public/posts?${params.toString()}`,
        ),
      emptyPage<PostSummaryDto>(PAGE_SIZE),
      "news-list",
    ),
    withFallback(
      () => api.get<CategoryDto[]>("/api/public/categories"),
      [] as CategoryDto[],
      "news-categories",
    ),
  ]);

  return { posts, categories, q, category };
}

const NEWS_LIST_DESCRIPTION = "Últimas notícias, projetos e ações da FICAS.";

export const meta: Route.MetaFunction = () => [
  { title: "Notícias — FICAS" },
  { name: "description", content: NEWS_LIST_DESCRIPTION },
  { property: "og:title", content: "Notícias — FICAS" },
  { property: "og:description", content: NEWS_LIST_DESCRIPTION },
];

export default function NewsList({ loaderData }: Route.ComponentProps) {
  const { posts, categories, q, category } = loaderData;
  const filtered = Boolean(q || category);

  return (
    <div className="flex flex-col gap-8">
      <div className="breadcrumbs text-sm text-base-content/60">
        <ul>
          <li>
            <Link to="/" className="link link-hover">
              Início
            </Link>
          </li>
          <li>Notícias</li>
        </ul>
      </div>

      <PageHeader
        eyebrow="Publicações"
        title="Notícias"
        lead="Acompanhe as publicações, projetos e ações da FICAS."
      />

      <Form
        method="get"
        className="card border border-base-300 bg-base-100"
      >
        <div className="card-body flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-full">
            <label className="label" htmlFor="q">
              <span className="text-sm font-medium">Buscar</span>
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Digite para buscar…"
              className="input w-full"
            />
          </div>
          <div className="w-full sm:w-60">
            <label className="label" htmlFor="category">
              <span className="text-sm font-medium">Categoria</span>
            </label>
            <select
              id="category"
              name="category"
              defaultValue={category}
              className="select w-full"
            >
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">
              <SearchIcon className="h-4 w-4" /> Buscar
            </button>
            {filtered ? (
              <Link to="/noticias" className="btn btn-ghost">
                Limpar
              </Link>
            ) : null}
          </div>
        </div>
      </Form>

      {posts.content.length > 0 ? (
        <>
          <p className="text-sm text-base-content/60">
            {posts.totalElements}{" "}
            {posts.totalElements === 1 ? "publicação" : "publicações"}
            {filtered ? " encontradas" : ""}
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
          title="Nenhuma notícia encontrada"
          description={
            filtered
              ? "Tente ajustar a busca ou escolher outra categoria."
              : "Ainda não há publicações disponíveis."
          }
          action={
            filtered ? (
              <Link to="/noticias" className="btn btn-primary btn-sm">
                Limpar filtros
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
