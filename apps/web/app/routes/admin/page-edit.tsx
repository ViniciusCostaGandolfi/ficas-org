import { data, redirect } from "react-router";

import { NotFoundContent } from "~/components/NotFoundContent";
import { PageForm } from "~/components/admin/PageForm";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import {
  buildPagePayload,
  toActionError,
  uploadFromForm,
  validatePage,
} from "~/lib/admin.server";
import { createApi } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { ApiError, type AdminPageDto } from "~/lib/types";

import type { Route } from "./+types/page-edit";

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireUser(request);
  const api = createApi(request);

  try {
    const page = await api.get<AdminPageDto>(`/api/admin/pages/${params.id}`);
    return { page };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw data("Página não encontrada", { status: 404 });
    }
    throw error;
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const form = await request.formData();
  const api = createApi(request);
  const intent = String(form.get("intent") ?? "save");

  try {
    if (intent === "upload") {
      const media = await uploadFromForm(api, form);
      return {
        ok: true,
        media,
        message: "Mídia enviada com sucesso.",
        fieldErrors: {} as Record<string, string>,
      };
    }

    const payload = buildPagePayload(form);
    const fieldErrors = validatePage(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return data(
        { ok: false, fieldErrors, message: "Revise os campos destacados." },
        { status: 400 },
      );
    }

    await api.put(`/api/admin/pages/${params.id}`, payload);
    return redirect("/admin/pages");
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => [
  { title: `Editar: ${loaderData?.page?.title ?? "página"} — Painel FICAS` },
  { name: "robots", content: "noindex" },
];

export function ErrorBoundary() {
  return <NotFoundContent title="Página não encontrada" />;
}

export default function PageEdit({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Editar página"
        breadcrumb="Páginas"
        description={loaderData.page.title}
        actions={
          <a
            href={`/${loaderData.page.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
          >
            Ver no site
          </a>
        }
      />

      <PageForm
        mode="edit"
        page={loaderData.page}
        fieldErrors={actionData?.fieldErrors}
        message={actionData?.message}
        ok={actionData?.ok}
      />
    </div>
  );
}
