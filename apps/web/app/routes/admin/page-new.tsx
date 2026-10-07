import { data, redirect } from "react-router";

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
import type { AdminPageDto } from "~/lib/types";

import type { Route } from "./+types/page-new";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
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

    const created = await api.post<AdminPageDto>("/api/admin/pages", payload);
    if (created?.id) {
      return redirect(`/admin/pages/${created.id}/edit`);
    }
    return redirect("/admin/pages");
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Nova página — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function PageNew({ actionData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Nova página"
        description="Páginas institucionais são acessadas por /{slug}."
      />

      <PageForm
        mode="create"
        fieldErrors={actionData?.fieldErrors}
        message={actionData?.message}
        ok={actionData?.ok}
      />
    </div>
  );
}
