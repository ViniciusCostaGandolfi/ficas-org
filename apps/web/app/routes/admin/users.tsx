import { data, Form, Link, useFetcher } from "react-router";

import { Alert } from "~/components/Alert";
import { EmptyState } from "~/components/EmptyState";
import { FormField } from "~/components/FormField";
import { PencilIcon, TrashIcon } from "~/components/Icons";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import {
  buildUserPayload,
  toActionError,
  validateUser,
} from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { asArray } from "~/lib/format";
import type { UserDto } from "~/lib/types";

import type { Route } from "./+types/users";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
};

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const api = createApi(request);
  const url = new URL(request.url);
  const editId = url.searchParams.get("edit");

  const users = await withFallback(
    () => api.get<UserDto[]>("/api/admin/users"),
    [] as UserDto[],
    "admin-users",
  );
  const list = asArray<UserDto>(users);
  const editing = editId
    ? list.find((item) => String(item.id) === editId) ?? null
    : null;

  return { users: list, editing, currentUserId: user.id };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");
  const api = createApi(request);

  try {
    if (intent === "delete") {
      await api.delete(`/api/admin/users/${id}`);
      return {
        ok: true,
        message: "Usuário removido.",
        fieldErrors: {} as Record<string, string>,
      };
    }

    const isEdit = intent === "update";
    const payload = buildUserPayload(form);
    const fieldErrors = validateUser(payload, isEdit);
    if (Object.keys(fieldErrors).length > 0) {
      return data(
        { ok: false, fieldErrors, message: "Revise os campos destacados." },
        { status: 400 },
      );
    }

    if (isEdit) {
      await api.put(`/api/admin/users/${id}`, payload);
      return {
        ok: true,
        message: "Usuário atualizado.",
        fieldErrors: {} as Record<string, string>,
      };
    }

    await api.post("/api/admin/users", payload);
    return {
      ok: true,
      message: "Usuário criado.",
      fieldErrors: {} as Record<string, string>,
    };
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Usuários — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function Users({ loaderData, actionData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const { users, editing, currentUserId } = loaderData;
  const isEditing = editing !== null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Usuários"
        description="Gerencie quem tem acesso ao painel."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="rounded-box border border-base-300 bg-base-100">
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Papel</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    return (
                      <tr key={user.id}>
                        <td className="font-medium">
                          {user.name}
                          {isSelf ? (
                            <span className="ml-2 badge badge-ghost badge-sm">
                              Você
                            </span>
                          ) : null}
                        </td>
                        <td className="text-sm text-base-content/70">
                          {user.email}
                        </td>
                        <td className="text-sm">
                          {ROLE_LABELS[user.role] ?? user.role}
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Link
                              to={`/admin/users?edit=${user.id}`}
                              className="btn btn-ghost btn-xs"
                              aria-label={`Editar ${user.name}`}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                            {isSelf ? null : (
                              <fetcher.Form
                                method="post"
                                onSubmit={(event) => {
                                  if (
                                    !window.confirm(
                                      `Remover o usuário "${user.name}"?`,
                                    )
                                  ) {
                                    event.preventDefault();
                                  }
                                }}
                              >
                                <input type="hidden" name="id" value={user.id} />
                                <input type="hidden" name="intent" value="delete" />
                                <button
                                  type="submit"
                                  className="btn btn-ghost btn-xs text-error"
                                  aria-label={`Remover ${user.name}`}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </fetcher.Form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="Nenhum usuário"
                description="Crie o primeiro usuário para dar acesso ao painel."
              />
            </div>
          )}
        </section>

        <section className="card border border-base-300 bg-base-100">
          <div className="card-body gap-4">
            <h2 className="card-title text-lg">
              {isEditing ? "Editar usuário" : "Novo usuário"}
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
                label="E-mail"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={editing?.email ?? ""}
                error={actionData?.fieldErrors?.email}
              />

              <FormField
                label="Papel"
                name="role"
                as="select"
                defaultValue={editing?.role ?? "EDITOR"}
                error={actionData?.fieldErrors?.role}
              >
                <option value="ADMIN">Administrador</option>
                <option value="EDITOR">Editor</option>
              </FormField>

              <FormField
                label="Senha"
                name="password"
                type="password"
                autoComplete="new-password"
                required={!isEditing}
                help={
                  isEditing
                    ? "Deixe em branco para manter a senha atual"
                    : undefined
                }
                error={actionData?.fieldErrors?.password}
              />

              <div className="card-actions justify-end">
                {isEditing ? (
                  <Link to="/admin/users" className="btn btn-ghost">
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
