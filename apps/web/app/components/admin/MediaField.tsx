import { useEffect } from "react";
import { useFetcher } from "react-router";

import type { MediaDto } from "~/lib/types";

import { ImageIcon, UploadIcon } from "../Icons";
import { ImageWithFallback } from "../ImageWithFallback";

export interface MediaFieldProps {
  /** Used only for a11y ids; the hidden input lives inside the parent form. */
  name: string;
  label: string;
  imageUrl: string | null;
  error?: string;
  onChange: (id: string) => void;
  hint?: string;
}

interface UploadResult {
  ok?: boolean;
  media?: MediaDto;
  message?: string;
}

/**
 * Media picker that uploads to `/api/admin/media` through the current route
 * action (`intent=upload`). Render OUTSIDE the main `<form>` to avoid nested
 * forms; the caller keeps a hidden `name` input inside the form.
 */
export function MediaField({
  name,
  label,
  imageUrl,
  error,
  onChange,
  hint,
}: MediaFieldProps) {
  const fetcher = useFetcher<UploadResult>();
  const previewUrl = fetcher.data?.media?.url ?? imageUrl;
  const uploading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.media) {
      onChange(String(fetcher.data.media.id));
    }
    // `onChange` is a stable state setter from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data]);

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <p className="mb-3 text-sm font-medium" id={`${name}-label`}>
        {label}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-box bg-base-200">
          <ImageWithFallback
            src={previewUrl}
            alt="Pré-visualização"
            className="h-full w-full object-cover"
            fallback={
              <ImageIcon className="h-8 w-8 text-base-content/30" />
            }
          />
        </div>

        <fetcher.Form
          method="post"
          encType="multipart/form-data"
          className="flex grow flex-col gap-2"
        >
          <input type="hidden" name="intent" value="upload" />
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            aria-labelledby={`${name}-label`}
            className="file-input w-full"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="alt"
              placeholder="Texto alternativo (opcional)"
              className="input w-full"
            />
            <button type="submit" className="btn btn-outline" disabled={uploading}>
              {uploading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
              Enviar
            </button>
          </div>
          {fetcher.data?.message ? (
            <p className="text-xs text-error" role="alert">
              {fetcher.data.message}
            </p>
          ) : null}
        </fetcher.Form>
      </div>

      {hint ? <p className="mt-2 text-xs text-base-content/60">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
