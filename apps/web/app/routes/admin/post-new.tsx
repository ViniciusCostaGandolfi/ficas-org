import { data, redirect } from "react-router";

import { PostForm } from "~/components/admin/PostForm";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import {
  buildPostPayload,
  toActionError,
  uploadFromForm,
  validatePost,
} from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import type {
  AdminPostDto,
  CategoryDto,
  TagDto,
} from "~/lib/types";

import type { Route } from "./+types/post-new";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const api = createApi(request);

  const [categories, tags] = await Promise.all([
    withFallback(
      () => api.get<CategoryDto[]>("/api/admin/categories"),
      [] as CategoryDto[],
      "post-categories",
    ),
    withFallback(
      () => api.get<TagDto[]>("/api/public/tags"),
      [] as TagDto[],
      "post-tags",
    ),
  ]);

  return { categories, tags };
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

    const payload = buildPostPayload(form);
    const fieldErrors = validatePost(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return data(
        { ok: false, fieldErrors, message: "Revise os campos destacados." },
        { status: 400 },
      );
    }

    const created = await api.post<AdminPostDto>("/api/admin/posts", payload);
    if (created?.id) {
      return redirect(`/admin/posts/${created.id}/edit`);
    }
    return redirect("/admin/posts");
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Novo post — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function PostNew({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Novo post"
        description="Preencha os dados e publique quando estiver pronto."
      />

      <PostForm
        mode="create"
        categories={loaderData.categories}
        tags={loaderData.tags}
        fieldErrors={actionData?.fieldErrors}
        message={actionData?.message}
        ok={actionData?.ok}
      />
    </div>
  );
}
