import { useState } from "react";
import { Form, Link } from "react-router";

import { toLocalInput } from "~/lib/format";
import type {
  AdminPostDto,
  CategoryDto,
  ContentFormat,
  PostStatus,
  TagDto,
} from "~/lib/types";

import { Alert } from "../Alert";
import { FormField } from "../FormField";
import { MarkdownEditor } from "./MarkdownEditor";
import { MediaField } from "./MediaField";
import { TagMultiSelect } from "./TagMultiSelect";

export interface PostFormProps {
  mode: "create" | "edit";
  post?: AdminPostDto | null;
  categories: CategoryDto[];
  tags: TagDto[];
  fieldErrors?: Record<string, string>;
  message?: string;
  ok?: boolean;
}

export function PostForm({
  mode,
  post,
  categories,
  tags,
  fieldErrors = {},
  message,
  ok,
}: PostFormProps) {
  const [coverId, setCoverId] = useState(
    post?.coverMediaId ? String(post.coverMediaId) : "",
  );
  const [slug, setSlug] = useState(post?.slug ?? "");
  const selectedTagIds = new Set((post?.tagIds ?? []).map(String));

  // Existing rows keep their stored format (legacy HTML when absent); brand new
  // content starts in Markdown.
  const initialFormat: ContentFormat = post
    ? (post.contentFormat ?? "HTML")
    : "MARKDOWN";
  const legacyHtml = post != null && initialFormat === "HTML";
  const publicPath = slug.trim() ? `/noticias/${slug.trim()}` : null;

  return (
    <div className="flex flex-col gap-6">
      {message ? <Alert status={ok ? "success" : "error"}>{message}</Alert> : null}

      <MediaField
        name="coverMediaId"
        label="Imagem de capa"
        imageUrl={post?.coverImageUrl ?? null}
        error={fieldErrors.coverMediaId}
        onChange={setCoverId}
      />

      <Form method="post" className="card border border-base-300 bg-base-100">
        <div className="card-body gap-6">
        <input type="hidden" name="intent" value="save" />
        <input type="hidden" name="coverMediaId" value={coverId} />

        <div className="grid gap-5 lg:grid-cols-2">
          <FormField
            label="Título"
            name="title"
            required
            defaultValue={post?.title ?? ""}
            error={fieldErrors.title}
          />
          <FormField
            label="Slug"
            name="slug"
            required
            value={slug}
            onChange={setSlug}
            help="Usado na URL: /noticias/{slug}"
            error={fieldErrors.slug}
          />
        </div>

        <FormField
          label="Resumo"
          name="excerpt"
          as="textarea"
          rows={3}
          defaultValue={post?.excerpt ?? ""}
          help="Aparece nas listagens e nos resultados de busca."
          error={fieldErrors.excerpt}
        />

        <MarkdownEditor
          defaultValue={post?.content ?? ""}
          defaultFormat={initialFormat}
          legacyHtml={legacyHtml}
          publicPath={publicPath}
          error={fieldErrors.content}
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <FormField
            label="Categoria"
            name="categoryId"
            as="select"
            defaultValue={post?.categoryId ? String(post.categoryId) : ""}
            error={fieldErrors.categoryId}
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </FormField>

          <FormField
            label="Status"
            name="status"
            as="select"
            defaultValue={(post?.status ?? "DRAFT") as PostStatus}
            error={fieldErrors.status}
          >
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Arquivado</option>
          </FormField>

          <FormField
            label="Data de publicação"
            name="publishedAt"
            type="datetime-local"
            defaultValue={toLocalInput(post?.publishedAt)}
            error={fieldErrors.publishedAt}
          />
        </div>

        <TagMultiSelect
          tags={tags}
          selectedIds={selectedTagIds}
          error={fieldErrors.tagIds}
        />

        <fieldset className="fieldset rounded-box border border-base-300 p-4">
          <legend className="fieldset-legend">SEO</legend>
          <FormField
            label="Título para SEO"
            name="seoTitle"
            defaultValue={post?.seoTitle ?? ""}
            error={fieldErrors.seoTitle}
          />
          <FormField
            label="Descrição para SEO"
            name="seoDescription"
            as="textarea"
            rows={2}
            defaultValue={post?.seoDescription ?? ""}
            error={fieldErrors.seoDescription}
          />
        </fieldset>

        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/admin/posts" className="btn btn-ghost">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary">
            {mode === "create" ? "Criar post" : "Salvar alterações"}
          </button>
        </div>
        </div>
      </Form>
    </div>
  );
}
