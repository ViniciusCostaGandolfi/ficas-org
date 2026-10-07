import { data, Form, Link, useFetcher } from "react-router";

import { Alert } from "~/components/Alert";
import { EmptyState } from "~/components/EmptyState";
import { PencilIcon, PlusIcon, TrashIcon } from "~/components/Icons";
import { Pagination } from "~/components/Pagination";
import { StatusBadge } from "~/components/StatusBadge";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import { toActionError } from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import {
  emptyPage,
  type AdminPageSummaryDto,
  type Page,
} from "~/lib/types";

import type { Route } from "./+types/pages";

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
  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  });
  if (q) params.set("q", q);

  const api = createApi(request);
  const pages = await withFallback(
    () =>
      api.get<Page<AdminPageSummaryDto>>(`/api/admin/pages?${params.toString()}`),
    emptyPage<AdminPageSummaryDto>(PAGE_SIZE),
    "admin-pages",
  );

  return { pages, q };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const intent = String(form.get("intent") ?? "");
  const api = createApi(request);

  try {
    if (intent === "delete") {
      await api.delete(`/api/admin/pages/${id}`);
      return { ok: true, message: "Página removida com sucesso." };
    }
    return data({ ok: false, message: "Ação inválida." }, { status: 400 });
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Páginas — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function PagesList({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { pages, q } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Páginas"
        description={
          <>
            {pages.totalElements} página{pages.totalElements === 1 ? "" : "s"}{" "}
            institucional{pages.totalElements === 1 ? "" : "is"}.
          </>
        }
        actions={
          <Link to="/admin/pages/new" className="btn btn-primary">
            <PlusIcon className="h-4 w-4" /> Nova página
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
            placeholder="Título ou slug…"
            className="input w-full"
          />
        </div>
        <button type="submit" className="btn btn-outline">
          Filtrar
        </button>
      </Form>

      {pages.content.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Slug</th>
                  <th>Menu</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pages.content.map((page) => {
                  const status = page.status;
                  return (
                    <tr key={page.id}>
                      <td>
                        <Link
                          to={`/admin/pages/${page.id}/edit`}
                          className="font-medium hover:text-primary"
                        >
                          {page.title}
                        </Link>
                      </td>
                      <td className="text-sm text-base-content/60">
                        /{page.slug}
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            page.showInMenu ? "badge-primary" : "badge-ghost"
                          }`}
                        >
                          {page.showInMenu ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td>
                        {status ? (
                          <StatusBadge status={status} />
                        ) : (
                          <span className="text-base-content/40">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/pages/${page.id}/edit`}
                            className="btn btn-ghost btn-xs"
                            aria-label={`Editar ${page.title}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <fetcher.Form
                            method="post"
                            onSubmit={(event) => {
                              if (
                                !window.confirm(
                                  `Remover a página "${page.title}"?`,
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={page.id} />
                            <input type="hidden" name="intent" value="delete" />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs text-error"
                              aria-label={`Remover ${page.title}`}
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
          <Pagination page={pages.page} totalPages={pages.totalPages} />
        </>
      ) : (
        <EmptyState
          title="Nenhuma página encontrada"
          description={
            q ? "Ajuste a busca para ver outros resultados." : "Crie a primeira página."
          }
          action={
            <Link to="/admin/pages/new" className="btn btn-primary btn-sm">
              <PlusIcon className="h-4 w-4" /> Criar página
            </Link>
          }
        />
      )}
    </div>
  );
}
