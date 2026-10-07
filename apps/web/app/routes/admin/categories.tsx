import { data, Form, Link, useFetcher } from "react-router";

import { Alert } from "~/components/Alert";
import { EmptyState } from "~/components/EmptyState";
import { FormField } from "~/components/FormField";
import { PencilIcon, TrashIcon } from "~/components/Icons";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import {
  buildCategoryPayload,
  toActionError,
  validateCategory,
} from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { asArray } from "~/lib/format";
import type { CategoryDto } from "~/lib/types";

import type { Route } from "./+types/categories";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const api = createApi(request);
  const url = new URL(request.url);
  const editId = url.searchParams.get("edit");

  const categories = await withFallback(
    () => api.get<CategoryDto[]>("/api/admin/categories"),
    [] as CategoryDto[],
    "admin-categories",
  );
  const list = asArray<CategoryDto>(categories);
  const editing = editId
    ? list.find((item) => String(item.id) === editId) ?? null
    : null;

  return { categories: list, editing };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");
  const api = createApi(request);

  try {
    if (intent === "delete") {
      await api.delete(`/api/admin/categories/${id}`);
      return {
        ok: true,
        message: "Categoria removida.",
        fieldErrors: {} as Record<string, string>,
      };
    }

    const payload = buildCategoryPayload(form);
    const fieldErrors = validateCategory(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return data(
        { ok: false, fieldErrors, message: "Revise os campos destacados." },
        { status: 400 },
      );
    }

    if (intent === "update") {
      await api.put(`/api/admin/categories/${id}`, payload);
      return {
        ok: true,
        message: "Categoria atualizada.",
        fieldErrors: {} as Record<string, string>,
      };
    }

    await api.post("/api/admin/categories", payload);
    return {
      ok: true,
      message: "Categoria criada.",
      fieldErrors: {} as Record<string, string>,
    };
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Categorias — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function Categories({ loaderData, actionData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { categories, editing } = loaderData;
  const isEditing = editing !== null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Categorias"
        description="Organize os posts por assunto."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="rounded-box border border-base-300 bg-base-100">
          {categories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Slug</th>
                    <th>Descrição</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="font-medium">{category.name}</td>
                      <td className="text-sm text-base-content/60">
                        {category.slug}
                      </td>
                      <td className="max-w-xs truncate text-sm text-base-content/70">
                        {category.description || "—"}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/categories?edit=${category.id}`}
                            className="btn btn-ghost btn-xs"
                            aria-label={`Editar ${category.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <fetcher.Form
                            method="post"
                            onSubmit={(event) => {
                              if (
                                !window.confirm(
                                  `Remover a categoria "${category.name}"?`,
                                )
                              ) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={category.id} />
                            <input type="hidden" name="intent" value="delete" />
                            <button
                              type="submit"
                              className="btn btn-ghost btn-xs text-error"
                              aria-label={`Remover ${category.name}`}
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
          ) : (
            <div className="p-4">
              <EmptyState
                title="Nenhuma categoria"
                description="Crie a primeira categoria para organizar seus posts."
              />
            </div>
          )}
        </section>

        <section className="card border border-base-300 bg-base-100">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg">
              {isEditing ? "Editar categoria" : "Nova categoria"}
            </h2>

            {fetcher.data?.message ? (
              <Alert status={fetcher.data.ok ? "success" : "error"}>
                {fetcher.data.message}
              </Alert>
            ) : null}
            {actionData?.message ? (
              <Alert status={actionData.ok ? "success" : "error"}>
                {actionData.message}
              </Alert>
            ) : null}

            <Form
              key={editing?.id ?? "new"}
              method="post"
              className="flex flex-col gap-4"
            >
              <input
                type="hidden"
                name="intent"
                value={isEditing ? "update" : "create"}
              />
              {editing ? (
                <input type="hidden" name="id" value={editing.id} />
              ) : null}

              <FormField
                label="Nome"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                error={actionData?.fieldErrors?.name}
              />

              <FormField
                label="Slug"
                name="slug"
                required
                defaultValue={editing?.slug ?? ""}
                help="Usado na URL: /categoria/{slug}"
                error={actionData?.fieldErrors?.slug}
              />

              <FormField
                label="Descrição"
                name="description"
                as="textarea"
                rows={3}
                defaultValue={editing?.description ?? ""}
              />

              <FormField
                label="Ordem"
                name="sortOrder"
                type="number"
                defaultValue={0}
              />

              <div className="card-actions justify-end">
                {isEditing ? (
                  <Link to="/admin/categories" className="btn btn-ghost">
                    Cancelar
                  </Link>
                ) : null}
                <button type="submit" className="btn btn-primary">
                  {isEditing ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </Form>
          </div>
        </section>
      </div>
    </div>
  );
}
