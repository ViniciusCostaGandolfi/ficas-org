import { data, redirect } from "react-router";

import { NotFoundContent } from "~/components/NotFoundContent";
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
import {
  ApiError,
  type AdminPostDto,
  type CategoryDto,
  type TagDto,
} from "~/lib/types";

import type { Route } from "./+types/post-edit";

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireUser(request);
  const api = createApi(request);

  let post: AdminPostDto;
  try {
    post = await api.get<AdminPostDto>(`/api/admin/posts/${params.id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw data("Post não encontrado", { status: 404 });
    }
    throw error;
  }

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

  return { post, categories, tags };
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

    const payload = buildPostPayload(form);
    const fieldErrors = validatePost(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return data(
        { ok: false, fieldErrors, message: "Revise os campos destacados." },
        { status: 400 },
      );
    }

    await api.put(`/api/admin/posts/${params.id}`, payload);
    return redirect("/admin/posts");
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => [
  { title: `Editar: ${loaderData?.post?.title ?? "post"} — Painel FICAS` },
  { name: "robots", content: "noindex" },
];

export function ErrorBoundary() {
  return <NotFoundContent title="Post não encontrado" />;
}

export default function PostEdit({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Editar post"
        breadcrumb="Posts"
        description={loaderData.post.title}
        actions={
          <a
            href={`/noticias/${loaderData.post.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
          >
            Ver no site
          </a>
        }
      />

      <PostForm
        mode="edit"
        post={loaderData.post}
        categories={loaderData.categories}
        tags={loaderData.tags}
        fieldErrors={actionData?.fieldErrors}
        message={actionData?.message}
        ok={actionData?.ok}
      />
    </div>
  );
}
