import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFetcher } from "react-router";

import { getApiOrigin } from "~/lib/media";
import type { MediaDto, Page } from "~/lib/types";

import { CloseIcon, ImageIcon, SearchIcon, UploadIcon } from "../Icons";
import { ImageWithFallback } from "../ImageWithFallback";

const PAGE_SIZE = 24;

export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaDto) => void;
  title?: string;
}

interface UploadResult {
  ok?: boolean;
  media?: MediaDto;
  message?: string;
}

/**
 * daisyUI modal that lists the media library and returns the chosen item.
 *
 * Uses the native `<dialog>` element so Esc-to-close, focus trapping and the
 * backdrop are handled by the platform; it is rendered through a portal so the
 * inner upload form never nests inside the caller's form.
 */
export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  title = "Biblioteca de mídia",
}: MediaPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [items, setItems] = useState<MediaDto[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const uploadFetcher = useFetcher<UploadResult>();
  const uploading = uploadFetcher.state !== "idle";

  // Open/close the native dialog (Esc + focus trap come for free).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Start on the first page whenever the modal is reopened.
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  // Load the library from the API (client-side; the auth cookie is included).
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (query) params.set("q", query);

    fetch(`${getApiOrigin()}/api/admin/media?${params.toString()}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as Page<MediaDto>;
      })
      .then((data) => {
        if (!active) return;
        setItems(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(() => {
        if (!active) return;
        setError("Não foi possível carregar a biblioteca de mídia.");
        setItems([]);
        setTotalPages(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, page, query, refresh]);

  // After a successful upload, reload the first page so it shows up.
  useEffect(() => {
    if (uploadFetcher.data?.ok && uploadFetcher.data.media) {
      setSearchInput("");
      setQuery("");
      setPage(0);
      setRefresh((value) => value + 1);
    }
  }, [uploadFetcher.data]);

  function submitSearch() {
    setPage(0);
    setQuery(searchInput.trim());
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="modal-box flex max-h-[85vh] w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form
          method="get"
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <div className="w-full">
            <label className="label" htmlFor="media-picker-q">
              <span className="text-sm font-medium">Buscar</span>
            </label>
            <input
              id="media-picker-q"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nome do arquivo…"
              className="input w-full"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-outline">
            <SearchIcon className="h-4 w-4" /> Filtrar
          </button>
        </form>

        <uploadFetcher.Form
          method="post"
          encType="multipart/form-data"
          className="rounded-box border border-base-300 bg-base-200/40 p-3"
        >
          <input type="hidden" name="intent" value="upload" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full">
              <label className="label" htmlFor="media-picker-file">
                <span className="text-sm font-medium">Enviar novo arquivo</span>
              </label>
              <input
                key={refresh}
                id="media-picker-file"
                type="file"
                name="file"
                accept="image/*"
                required
                className="file-input w-full"
              />
            </div>
            <input
              type="text"
              name="alt"
              placeholder="Texto alternativo (opcional)"
              className="input w-full sm:max-w-56"
            />
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
              Enviar
            </button>
          </div>
          {uploadFetcher.data?.message ? (
            <p
              className={`mt-2 text-xs ${
                uploadFetcher.data.ok ? "text-success" : "text-error"
              }`}
              role="alert"
            >
              {uploadFetcher.data.message}
            </p>
          ) : null}
        </uploadFetcher.Form>

        <div className="min-h-[16rem] grow overflow-y-auto pr-1">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-error" role="alert">
              {error}
            </p>
          ) : items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="group flex w-full flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 text-left transition hover:border-primary/50 hover:shadow-md"
                    aria-label={`Selecionar ${item.alt ?? item.filename}`}
                  >
                    <span className="flex aspect-square w-full items-center justify-center bg-base-200">
                      {item.mimeType.startsWith("image/") ? (
                        <ImageWithFallback
                          src={item.url}
                          alt={item.alt ?? item.filename}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-base-content/30" />
                      )}
                    </span>
                    <span
                      className="truncate px-2 py-1.5 text-xs font-medium"
                      title={item.filename}
                    >
                      {item.filename}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-base-content/60">
              Nenhuma mídia encontrada.
            </p>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 0 || loading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Anterior
            </button>
            <span className="text-xs text-base-content/60">
              Página {page + 1} de {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </button>
          </div>
        ) : null}
      </div>

      <form method="dialog" className="modal-backdrop">
        <button aria-label="Fechar">close</button>
      </form>
    </dialog>,
    document.body,
  );
}
