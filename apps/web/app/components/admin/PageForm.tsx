import { useState } from "react";
import { Form, Link } from "react-router";

import type { AdminPageDto, ContentFormat, PostStatus } from "~/lib/types";

import { Alert } from "../Alert";
import { FormField } from "../FormField";
import { MarkdownEditor } from "./MarkdownEditor";
import { MediaField } from "./MediaField";

export interface PageFormProps {
  mode: "create" | "edit";
  page?: AdminPageDto | null;
  fieldErrors?: Record<string, string>;
  message?: string;
  ok?: boolean;
}

export function PageForm({
  mode,
  page,
  fieldErrors = {},
  message,
  ok,
}: PageFormProps) {
  const [heroId, setHeroId] = useState(
    page?.heroMediaId ? String(page.heroMediaId) : "",
  );
  const [slug, setSlug] = useState(page?.slug ?? "");

  const initialFormat: ContentFormat = page
    ? (page.contentFormat ?? "HTML")
    : "MARKDOWN";
  const legacyHtml = page != null && initialFormat === "HTML";
  const publicPath = slug.trim() ? `/${slug.trim()}` : null;

  return (
    <div className="flex flex-col gap-6">
      {message ? <Alert status={ok ? "success" : "error"}>{message}</Alert> : null}

      <MediaField
        name="heroMediaId"
        label="Imagem de destaque"
        imageUrl={page?.heroImageUrl ?? null}
        error={fieldErrors.heroMediaId}
        onChange={setHeroId}
      />

      <Form method="post" className="card border border-base-300 bg-base-100">
        <div className="card-body gap-6">
        <input type="hidden" name="intent" value="save" />
        <input type="hidden" name="heroMediaId" value={heroId} />

        <div className="grid gap-5 lg:grid-cols-2">
          <FormField
            label="Título"
            name="title"
            required
            defaultValue={page?.title ?? ""}
            error={fieldErrors.title}
          />
          <FormField
            label="Slug"
            name="slug"
            required
            value={slug}
            onChange={setSlug}
            help="Usado na URL: /{slug}"
            error={fieldErrors.slug}
          />
        </div>

        <FormField
          label="Resumo"
          name="excerpt"
          as="textarea"
          rows={3}
          defaultValue={page?.excerpt ?? ""}
          error={fieldErrors.excerpt}
        />

        <MarkdownEditor
          defaultValue={page?.content ?? ""}
          defaultFormat={initialFormat}
          legacyHtml={legacyHtml}
          publicPath={publicPath}
          error={fieldErrors.content}
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <FormField
            label="Ordem no menu"
            name="menuOrder"
            type="number"
            min={0}
            defaultValue={page?.menuOrder ?? 0}
            error={fieldErrors.menuOrder}
          />

          <FormField
            label="Status"
            name="status"
            as="select"
            defaultValue={(page?.status ?? "DRAFT") as PostStatus}
            error={fieldErrors.status}
          >
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Arquivado</option>
          </FormField>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="showInMenu"
                className="checkbox checkbox-primary"
                defaultChecked={page?.showInMenu ?? false}
              />
              Exibir no menu
            </label>
          </div>
        </div>

        <fieldset className="fieldset rounded-box border border-base-300 p-4">
          <legend className="fieldset-legend">SEO</legend>
          <FormField
            label="Título para SEO"
            name="seoTitle"
            defaultValue={page?.seoTitle ?? ""}
            error={fieldErrors.seoTitle}
          />
          <FormField
            label="Descrição para SEO"
            name="seoDescription"
            as="textarea"
            rows={2}
            defaultValue={page?.seoDescription ?? ""}
            error={fieldErrors.seoDescription}
          />
        </fieldset>

        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/admin/pages" className="btn btn-ghost">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary">
            {mode === "create" ? "Criar página" : "Salvar alterações"}
          </button>
        </div>
        </div>
      </Form>
    </div>
  );
}
