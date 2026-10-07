import { data, Form, Link, useFetcher } from "react-router";

import { Alert } from "~/components/Alert";
import { EmptyState } from "~/components/EmptyState";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "~/components/Icons";
import { Pagination } from "~/components/Pagination";
import { StatusBadge } from "~/components/StatusBadge";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import { toActionError } from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { formatDate } from "~/lib/format";
import {
  ApiError,
  emptyPage,
  type AdminPostSummaryDto,
  type CategoryDto,
  type Page,
  type PostStatus,
} from "~/lib/types";

import type { Route } from "./+types/posts";

const PAGE_SIZE = 10;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";

  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  });
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  const api = createApi(request);
  const [posts, categories] = await Promise.all([
    withFallback(
      () =>
        api.get<Page<AdminPostSummaryDto>>(
          `/api/admin/posts?${params.toString()}`,
        ),
      emptyPage<AdminPostSummaryDto>(PAGE_SIZE),
      "admin-posts",
    ),
    withFallback(
      () => api.get<CategoryDto[]>("/api/admin/categories"),
      [] as CategoryDto[],
      "admin-categories",
    ),
  ]);

  return { posts, categories, q, status };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");
  const api = createApi(request);

  try {
    if (intent === "delete") {
      await api.delete(`/api/admin/posts/${id}`);
      return { ok: true, message: "Post removido com sucesso." };
    }
    if (intent === "publish") {
      await api.post(`/api/admin/posts/${id}/publish`);
      return { ok: true, message: "Post publicado." };
    }
    if (intent === "unpublish") {
      await api.post(`/api/admin/posts/${id}/unpublish`);
      return { ok: true, message: "Post despublicado." };
    }
    return data({ ok: false, message: "Ação inválida." }, { status: 400 });
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Posts — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function PostsList({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { posts, categories, q, status } = loaderData;
  const isBusy = fetcher.state !== "idle";

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Posts"
        description={
          <>
            {posts.totalElements} publicaç
            {posts.totalElements === 1 ? "ão" : "ões"} no site.
          </>
        }
        actions={
          <Link to="/admin/posts/new" className="btn btn-primary">
            <PlusIcon className="h-4 w-4" /> Novo post
          </Link>
        }
      />

      {fetcher.data?.message ? (
        <Alert status={fetcher.data.ok ? "success" : "error"}>
          {fetcher.data.message}
        </Alert>
      ) : null}

      <Form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full">
          <label className="label" htmlFor="q">
            <span className="text-sm font-medium">Buscar</span>
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Título ou conteúdo…"
            className="input w-full"
          />
        </div>
        <div className="w-full sm:w-52">
          <label className="label" htmlFor="status">
            <span className="text-sm font-medium">Status</span>
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="select w-full"
          >
            <option value="">Todos</option>
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </div>
        <button type="submit" className="btn btn-outline">
          <SearchIcon className="h-4 w-4" /> Filtrar
        </button>
      </Form>

      {posts.content.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Publicado em</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {posts.content.map((post) => {
                  const postStatus: PostStatus = post.status ?? "DRAFT";
                  return (
                    <tr key={post.id}>
                      <td>
                        <Link
                          to={`/admin/posts/${post.id}/edit`}
                          className="font-medium hover:text-primary"
                        >
                          {post.title}
                        </Link>
                        <p className="text-xs text-base-content/50">
                          /{post.slug}
                        </p>
                      </td>
                      <td>
                        {post.category ? (
                          <span className="badge badge-ghost badge-sm">
                            {post.category.name}
                          </span>
                        ) : (
                          <span className="text-base-content/40">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={postStatus} />
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        {formatDate(post.publishedAt) || "—"}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/posts/${post.id}/edit`}
                            className="btn btn-ghost btn-xs"
                            aria-label={`Editar ${post.title}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>

                          <fetcher.Form method="post">
                            <input type="hidden" name="id" value={post.id} />
                            <input
                              type="hidden"
                              name="intent"
                              value={
                                postStatus === "PUBLISHED"
                                  ? "unpublish"
                                  : "publish"
                              }
                            />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs"
                              disabled={isBusy}
                            >
                              {postStatus === "PUBLISHED"
                                ? "Despublicar"
                                : "Publicar"}
                            </button>
                          </fetcher.Form>

                          <fetcher.Form
                            method="post"
                            onSubmit={(event) => {
                              if (
                                !window.confirm(
                                  `Remover o post "${post.title}"?`,
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={post.id} />
                            <input type="hidden" name="intent" value="delete" />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs text-error"
                              aria-label={`Remover ${post.title}`}
                              disabled={isBusy}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </fetcher.Form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={posts.page} totalPages={posts.totalPages} />
        </>
      ) : (
        <EmptyState
          title="Nenhum post encontrado"
          description={
            q || status
              ? "Ajuste os filtros para ver outros resultados."
              : "Comece criando o primeiro post."
          }
          action={
            <Link to="/admin/posts/new" className="btn btn-primary btn-sm">
              <PlusIcon className="h-4 w-4" /> Criar post
            </Link>
          }
        />
      )}
    </div>
  );
}
