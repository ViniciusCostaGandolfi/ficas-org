import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";

import { renderContentHtml } from "~/lib/markdown";
import type { ContentFormat, MediaDto } from "~/lib/types";

import { Alert } from "../Alert";
import { ArrowUpRightIcon, EyeIcon, PencilIcon } from "../Icons";

export interface MarkdownEditorProps {
  /** Textarea name submitted with the parent form. */
  name?: string;
  /** Select name submitted with the parent form. */
  formatName?: string;
  defaultValue?: string;
  /** Initial format — legacy rows default to HTML, new content to Markdown. */
  defaultFormat?: ContentFormat;
  /** Show the "legacy HTML" notice while the editor is in HTML mode. */
  legacyHtml?: boolean;
  /** Public URL for "Ver a página"; `null` disables the button. */
  publicPath?: string | null;
  error?: string;
}

const CHEATSHEET: ReadonlyArray<{ syntax: string; label: string }> = [
  { syntax: "# Título", label: "Título principal" },
  { syntax: "## Subtítulo", label: "Título de seção" },
  { syntax: "**negrito**", label: "Negrito" },
  { syntax: "*itálico*", label: "Itálico" },
  { syntax: "- item", label: "Lista com marcadores" },
  { syntax: "1. item", label: "Lista numerada" },
  { syntax: "[texto](https://…)", label: "Link" },
  { syntax: "![descrição](https://…)", label: "Imagem" },
  { syntax: "> citação", label: "Citação" },
  { syntax: "`código`", label: "Código em linha" },
  { syntax: "| a | b |", label: "Tabela (GFM)" },
  { syntax: "---", label: "Linha divisória" },
];

type ViewMode = "edit" | "preview";

interface UploadResult {
  ok?: boolean;
  media?: MediaDto;
  message?: string;
}

interface PendingUpload {
  /** Unique marker temporarily written at the caret, replaced when done. */
  placeholder: string;
  file: File;
  alt: string;
}

/** Pull the image files out of a paste event (files first, then items). */
function imageFilesFrom(clipboard: DataTransfer | null): File[] {
  if (!clipboard) return [];
  const files: File[] = [];

  for (const file of Array.from(clipboard.files ?? [])) {
    if (file.type.startsWith("image/")) files.push(file);
  }
  if (files.length === 0) {
    for (const item of Array.from(clipboard.items ?? [])) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }
  return files;
}

function altFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base || "imagem";
}

/**
 * Single-pane Markdown/HTML authoring with an "Editar"/"Prévia" view toggle.
 *
 * The textarea stays mounted (only hidden) while previewing so the parent form
 * always submits `name="content"`. Pasting image files — like GitHub PR
 * comments — uploads each one through the current route action (`intent=upload`
 * → `uploadFromForm` → `POST /api/admin/media`, the same flow the media picker
 * uses) and inserts `![alt](url)` at the caret. A placeholder is written first
 * so typed text and the caret stay put while the upload is in flight.
 */
export function MarkdownEditor({
  name = "content",
  formatName = "contentFormat",
  defaultValue = "",
  defaultFormat = "MARKDOWN",
  legacyHtml = false,
  publicPath = null,
  error,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(defaultValue);
  const [format, setFormat] = useState<ContentFormat>(defaultFormat);
  const [view, setView] = useState<ViewMode>("edit");
  const [pending, setPending] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholderSeq = useRef(0);
  // One upload runs at a time: the fetcher can only hold a single submission,
  // so the rest wait in this queue and start as each one finishes.
  const queueRef = useRef<PendingUpload[]>([]);
  const activeRef = useRef<PendingUpload | null>(null);

  const uploadFetcher = useFetcher<UploadResult>();
  const uploading = pending > 0;

  const previewHtml = useMemo(
    () => renderContentHtml(content, format),
    [content, format],
  );
  const hasContent = content.trim().length > 0;

  function pumpQueue() {
    if (activeRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    activeRef.current = next;
    const body = new FormData();
    body.set("intent", "upload");
    body.set("file", next.file);
    uploadFetcher.submit(body, {
      method: "post",
      encType: "multipart/form-data",
    });
  }

  // Drive the queue: start the next upload, or settle the one that just ended.
  useEffect(() => {
    if (uploadFetcher.state !== "idle") return;

    const finished = activeRef.current;
    if (!finished) {
      pumpQueue();
      return;
    }

    activeRef.current = null;
    setPending((count) => Math.max(0, count - 1));

    const media = uploadFetcher.data?.ok ? uploadFetcher.data.media : undefined;
    const markdown = media
      ? `![${finished.alt}](${media.url})`
      : `<!-- falha ao enviar ${finished.file.name} -->`;
    setContent((previous) =>
      previous.includes(finished.placeholder)
        ? previous.replace(finished.placeholder, markdown)
        : `${previous}\n${markdown}`,
    );

    pumpQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFetcher.state, uploadFetcher.data]);

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = imageFilesFrom(event.clipboardData);
    if (files.length === 0) return; // plain text paste — leave it to the browser

    event.preventDefault();

    const textarea = event.currentTarget;
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? start;

    const items: PendingUpload[] = files.map((file) => {
      const id = ++placeholderSeq.current;
      return {
        placeholder: `![enviando imagem…](upload-${id})`,
        file,
        alt: altFromFilename(file.name),
      };
    });
    const insertion = items.map((item) => item.placeholder).join("\n");

    setContent(
      (previous) => previous.slice(0, start) + insertion + previous.slice(end),
    );
    queueRef.current.push(...items);
    setPending((count) => count + items.length);
    pumpQueue();

    // Put the caret right after the placeholders once React has repainted.
    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      const caret = start + insertion.length;
      element.focus();
      element.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <label className="label" htmlFor="field-content">
          <span className="text-sm font-medium">
            Conteúdo{error ? <span className="text-error"> *</span> : null}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-base-content/60">
            Formato
            <select
              name={formatName}
              value={format}
              onChange={(event) =>
                setFormat(event.target.value === "MARKDOWN" ? "MARKDOWN" : "HTML")
              }
              className="select select-sm w-36"
              aria-label="Formato do conteúdo"
            >
              <option value="MARKDOWN">Markdown</option>
              <option value="HTML">HTML</option>
            </select>
          </label>

          {publicPath ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              Ver a página
              <ArrowUpRightIcon className="h-4 w-4" />
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled
              title="Preencha o slug para abrir a página"
            >
              Ver a página
              <ArrowUpRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {format === "HTML" && legacyHtml ? (
        <Alert status="info" className="mb-3 text-sm">
          <span>
            Este conteúdo está em HTML. Ele continua sendo exibido como está —
            alterne o formato para <strong>Markdown</strong> quando quiser
            escrever com formatação mais simples.
          </span>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-box border border-base-300 bg-base-100">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 bg-base-200/50 px-3 py-2">
          <div className="join" role="group" aria-label="Modo de visualização">
            <button
              type="button"
              onClick={() => setView("edit")}
              aria-pressed={view === "edit"}
              className={`btn btn-sm join-item ${
                view === "edit" ? "btn-active" : "btn-ghost"
              }`}
            >
              <PencilIcon className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setView("preview")}
              aria-pressed={view === "preview"}
              className={`btn btn-sm join-item ${
                view === "preview" ? "btn-active" : "btn-ghost"
              }`}
            >
              <EyeIcon className="h-4 w-4" />
              Prévia
            </button>
          </div>

          {uploading ? (
            <span
              className="flex items-center gap-2 text-xs font-medium text-base-content/60"
              role="status"
            >
              <span className="loading loading-spinner loading-xs" />
              enviando imagem…
            </span>
          ) : (
            <span className="text-xs text-base-content/45">
              Cole uma imagem para enviá-la
            </span>
          )}
        </div>

        <div className={view === "edit" ? "block" : "hidden"}>
          <textarea
            id="field-content"
            ref={textareaRef}
            name={name}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onPaste={handlePaste}
            rows={18}
            spellCheck={false}
            placeholder={
              format === "MARKDOWN"
                ? "# Título\n\nEscreva em **Markdown**…"
                : "<p>Escreva em HTML…</p>"
            }
            aria-invalid={error ? true : undefined}
            className={`textarea w-full min-h-[26rem] resize-y rounded-none border-0 bg-transparent font-mono text-sm focus:outline-none focus-visible:outline-none ${
              error ? "textarea-error" : ""
            }`}
          />
        </div>

        <div className={view === "preview" ? "block" : "hidden"}>
          <div className="min-h-[26rem] p-5">
            {hasContent ? (
              <div
                className="cms-content prose max-w-none"
                // Preview of trusted, editor-authored content.
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-sm text-base-content/45">
                A pré-visualização aparece aqui conforme você digita.
              </p>
            )}
          </div>
        </div>
      </div>

      <details className="collapse collapse-arrow mt-3 rounded-box border border-base-300 bg-base-100">
        <summary className="collapse-title min-h-0 py-3 text-sm font-medium">
          Como usar Markdown
        </summary>
        <div className="collapse-content">
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Sintaxe</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {CHEATSHEET.map((item) => (
                  <tr key={item.syntax}>
                    <td>
                      <code className="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">
                        {item.syntax}
                      </code>
                    </td>
                    <td className="text-base-content/70">{item.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <a
            href="https://www.markdownguide.org/basic-syntax/"
            target="_blank"
            rel="noreferrer"
            className="link link-primary mt-3 inline-flex items-center gap-1 text-sm font-medium"
          >
            Guia completo de sintaxe
            <ArrowUpRightIcon className="h-4 w-4" />
          </a>
        </div>
      </details>

      {error ? (
        <p className="label text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
