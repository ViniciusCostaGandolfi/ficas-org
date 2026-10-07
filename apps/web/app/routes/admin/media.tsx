import { data, Form, useFetcher } from "react-router";

import { Alert } from "~/components/Alert";
import { EmptyState } from "~/components/EmptyState";
import { ImageIcon, TrashIcon, UploadIcon } from "~/components/Icons";
import { ImageWithFallback } from "~/components/ImageWithFallback";
import { Pagination } from "~/components/Pagination";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import { toActionError, uploadFromForm } from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { formatBytes } from "~/lib/format";
import { resolveMediaUrl } from "~/lib/media";
import { emptyPage, type MediaDto, type Page } from "~/lib/types";

import type { Route } from "./+types/media";

const PAGE_SIZE = 24;

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
  const media = await withFallback(
    () => api.get<Page<MediaDto>>(`/api/admin/media?${params.toString()}`),
    emptyPage<MediaDto>(PAGE_SIZE),
    "admin-media",
  );

  return { media, q };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const api = createApi(request);

  try {
    if (intent === "upload") {
      const media = await uploadFromForm(api, form);
      return { ok: true, media, message: "Mídia enviada com sucesso." };
    }
    if (intent === "delete") {
      await api.delete(`/api/admin/media/${String(form.get("id") ?? "")}`);
      return { ok: true, message: "Mídia removida." };
    }
    return data({ ok: false, message: "Ação inválida." }, { status: 400 });
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Mídia — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function MediaLibrary({ loaderData, actionData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { media, q } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Mídia"
        description={
          <>
            {media.totalElements} arquivo{media.totalElements === 1 ? "" : "s"} na
            biblioteca.
          </>
        }
      />

      {actionData?.message ? (
        <Alert status={actionData.ok ? "success" : "error"}>
          {actionData.message}
        </Alert>
      ) : null}
      {fetcher.data?.message ? (
        <Alert status={fetcher.data.ok ? "success" : "error"}>
          {fetcher.data.message}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="card border border-base-300 bg-base-100">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg">Enviar arquivo</h2>
            <Form
              method="post"
              encType="multipart/form-data"
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="intent" value="upload" />
              <input
                type="file"
                name="file"
                required
                accept="image/*,application/pdf"
                className="file-input w-full"
              />
              <input
                type="text"
                name="alt"
                placeholder="Texto alternativo (opcional)"
                className="input w-full"
              />
              <button type="submit" className="btn btn-primary">
                <UploadIcon className="h-4 w-4" /> Enviar
              </button>
            </Form>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Form method="get" className="flex items-end gap-3">
            <div className="w-full">
              <label className="label" htmlFor="q">
                <span className="text-sm font-medium">Buscar</span>
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Nome do arquivo…"
                className="input w-full"
              />
            </div>
            <button type="submit" className="btn btn-outline">
              Filtrar
            </button>
          </Form>

          {media.content.length > 0 ? (
            <>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {media.content.map((item) => (
                  <li
                    key={item.id}
                    className="card overflow-hidden border border-base-300 bg-base-100"
                  >
                    <figure className="aspect-square bg-base-200">
                      {item.mimeType.startsWith("image/") ? (
                        <ImageWithFallback
                          src={resolveMediaUrl(item.url)}
                          alt={item.alt ?? item.filename}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-base-content/30">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}
                    </figure>
                    <div className="card-body gap-2 p-3">
                      <p className="truncate text-sm font-medium" title={item.filename}>
                        {item.filename}
                      </p>
                      <p className="text-xs text-base-content/50">
                        {formatBytes(item.sizeBytes)}
                      </p>
                      <div className="card-actions justify-end">
                        <fetcher.Form
                          method="post"
                          onSubmit={(event) => {
                            if (
                              !window.confirm(`Remover "${item.filename}"?`)
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="intent" value="delete" />
                          <button
                            type="submit"
                            className="btn btn-ghost btn-xs text-error"
                            aria-label={`Remover ${item.filename}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </fetcher.Form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={media.page} totalPages={media.totalPages} />
            </>
          ) : (
            <EmptyState
              title="Nenhuma mídia encontrada"
              description={
                q
                  ? "Ajuste a busca para ver outros arquivos."
                  : "Envie imagens e documentos para usar no conteúdo."
              }
              icon={<ImageIcon className="h-10 w-10" />}
            />
          )}
        </div>
      </div>
    </div>
  );
}
