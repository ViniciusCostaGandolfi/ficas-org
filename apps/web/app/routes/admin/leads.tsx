import { data, useFetcher } from "react-router";

import { Alert } from "~/components/Alert";
import { EmptyState } from "~/components/EmptyState";
import { TrashIcon } from "~/components/Icons";
import { Pagination } from "~/components/Pagination";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import { toActionError } from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { formatDateTime } from "~/lib/format";
import { emptyPage, type ContactLeadDto, type Page } from "~/lib/types";

import type { Route } from "./+types/leads";

const PAGE_SIZE = 15;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));

  const api = createApi(request);
  const leads = await withFallback(
    () =>
      api.get<Page<ContactLeadDto>>(
        `/api/admin/leads?page=${page}&size=${PAGE_SIZE}`,
      ),
    emptyPage<ContactLeadDto>(PAGE_SIZE),
    "admin-leads",
  );

  return { leads };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const api = createApi(request);

  try {
    await api.delete(`/api/admin/leads/${id}`);
    return { ok: true, message: "Lead removido." };
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Leads — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function Leads({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { leads } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Leads"
        description={
          <>
            {leads.totalElements} contato{leads.totalElements === 1 ? "" : "s"}{" "}
            recebido{leads.totalElements === 1 ? "" : "s"} pelo site.
          </>
        }
      />

      {fetcher.data?.message ? (
        <Alert status={fetcher.data.ok ? "success" : "error"}>
          {fetcher.data.message}
        </Alert>
      ) : null}

      {leads.content.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Mensagem</th>
                  <th>Origem</th>
                  <th>Recebido em</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.content.map((lead) => (
                  <tr key={lead.id}>
                    <td className="font-medium">{lead.name}</td>
                    <td className="text-sm">
                      <a
                        href={`mailto:${lead.email}`}
                        className="link link-primary"
                      >
                        {lead.email}
                      </a>
                      {lead.phone ? (
                        <p className="text-base-content/60">{lead.phone}</p>
                      ) : null}
                    </td>
                    <td className="max-w-sm">
                      <p className="line-clamp-2 text-sm text-base-content/70">
                        {lead.message}
                      </p>
                    </td>
                    <td>
                      <span className="badge badge-ghost badge-sm">
                        {lead.source || "site"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {formatDateTime(lead.createdAt)}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <fetcher.Form
                          method="post"
                          onSubmit={(event) => {
                            if (!window.confirm(`Remover o lead "${lead.name}"?`)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={lead.id} />
                          <button
                            type="submit"
                            className="btn btn-ghost btn-xs text-error"
                            aria-label={`Remover ${lead.name}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </fetcher.Form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={leads.page} totalPages={leads.totalPages} />
        </>
      ) : (
        <EmptyState
          title="Nenhum lead recebido"
          description="Mensagens enviadas pelo formulário de contato aparecerão aqui."
        />
      )}
    </div>
  );
}
