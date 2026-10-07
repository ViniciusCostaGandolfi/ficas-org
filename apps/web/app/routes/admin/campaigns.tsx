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
  emptyPage,
  type AdminCampaignDto,
  type Page,
  type PostStatus,
} from "~/lib/types";

import type { Route } from "./+types/campaigns";

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
  const campaigns = await withFallback(
    () =>
      api.get<Page<AdminCampaignDto>>(
        `/api/admin/campaigns?${params.toString()}`,
      ),
    emptyPage<AdminCampaignDto>(PAGE_SIZE),
    "admin-campaigns",
  );

  return { campaigns, q };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const intent = String(form.get("intent") ?? "");
  const api = createApi(request);

  try {
    if (intent === "delete") {
      await api.delete(`/api/admin/campaigns/${id}`);
      return { ok: true, message: "Campanha removida com sucesso." };
    }
    if (intent === "publish") {
      await api.post(`/api/admin/campaigns/${id}/publish`);
      return { ok: true, message: "Campanha publicada." };
    }
    if (intent === "unpublish") {
      await api.post(`/api/admin/campaigns/${id}/unpublish`);
      return { ok: true, message: "Campanha despublicada." };
    }
    return data({ ok: false, message: "Ação inválida." }, { status: 400 });
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Campanhas — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function CampaignsList({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { campaigns, q } = loaderData;
  const isBusy = fetcher.state !== "idle";

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Campanhas"
        description={
          <>
            {campaigns.totalElements} campanha
            {campaigns.totalElements === 1 ? "" : "s"} cadastrada
            {campaigns.totalElements === 1 ? "" : "s"}.
          </>
        }
        actions={
          <Link to="/admin/campaigns/new" className="btn btn-primary">
            <PlusIcon className="h-4 w-4" /> Nova campanha
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
          <SearchIcon className="h-4 w-4" /> Filtrar
        </button>
      </Form>

      {campaigns.content.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Período</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.content.map((campaign) => {
                  const status: PostStatus = campaign.status ?? "DRAFT";
                  const startsAt = formatDate(campaign.startsAt);
                  const endsAt = formatDate(campaign.endsAt);
                  return (
                    <tr key={campaign.id}>
                      <td>
                        <Link
                          to={`/admin/campaigns/${campaign.id}/edit`}
                          className="font-medium hover:text-primary"
                        >
                          {campaign.title}
                        </Link>
                      </td>
                      <td className="text-sm text-base-content/60">
                        /{campaign.slug}
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        {startsAt || endsAt
                          ? `${startsAt || "—"} – ${endsAt || "—"}`
                          : "—"}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/campaigns/${campaign.id}/edit`}
                            className="btn btn-ghost btn-xs"
                            aria-label={`Editar ${campaign.title}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>

                          <fetcher.Form method="post">
                            <input type="hidden" name="id" value={campaign.id} />
                            <input
                              type="hidden"
                              name="intent"
                              value={
                                status === "PUBLISHED" ? "unpublish" : "publish"
                              }
                            />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs"
                              disabled={isBusy}
                            >
                              {status === "PUBLISHED"
                                ? "Despublicar"
                                : "Publicar"}
                            </button>
                          </fetcher.Form>

                          <fetcher.Form
                            method="post"
                            onSubmit={(event) => {
                              if (
                                !window.confirm(
                                  `Remover a campanha "${campaign.title}"?`,
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={campaign.id} />
                            <input type="hidden" name="intent" value="delete" />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs text-error"
                              aria-label={`Remover ${campaign.title}`}
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

          <Pagination page={campaigns.page} totalPages={campaigns.totalPages} />
        </>
      ) : (
        <EmptyState
          title="Nenhuma campanha encontrada"
          description={
            q
              ? "Ajuste a busca para ver outros resultados."
              : "Comece criando a primeira campanha."
          }
          action={
            <Link to="/admin/campaigns/new" className="btn btn-primary btn-sm">
              <PlusIcon className="h-4 w-4" /> Criar campanha
            </Link>
          }
        />
      )}
    </div>
  );
}
