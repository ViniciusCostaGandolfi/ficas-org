import { useState } from "react";

import { resolveMediaUrl } from "~/lib/media";
import type { MediaDto } from "~/lib/types";

import { ImageIcon, TrashIcon } from "../Icons";
import { ImageWithFallback } from "../ImageWithFallback";
import { MediaPickerModal } from "./MediaPickerModal";

export interface MediaUrlFieldProps {
  /** Form field name — the value sent is the media URL (settings store URLs). */
  name: string;
  label: string;
  defaultValue?: string | null;
  help?: string;
  error?: string;
}

/**
 * Settings image field: shows the current image, lets the editor pick another
 * from the media library, edit the URL by hand, or clear it. The value posted
 * with the form is the chosen media **URL** (not its id).
 */
export function MediaUrlField({
  name,
  label,
  defaultValue,
  help,
  error,
}: MediaUrlFieldProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const preview = resolveMediaUrl(value);
  const inputId = `field-${name}`;

  return (
    <div className="w-full">
      <label className="label" htmlFor={inputId}>
        <span className="text-sm font-medium">{label}</span>
      </label>

      <input type="hidden" name={name} value={value} />

      <div className="flex flex-col gap-4 rounded-box border border-base-300 bg-base-100 p-4 sm:flex-row">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-box bg-base-200">
          <ImageWithFallback
            src={preview}
            alt={`Pré-visualização de ${label}`}
            className="h-full w-full object-contain"
            fallback={<ImageIcon className="h-8 w-8 text-base-content/30" />}
          />
        </div>

        <div className="flex min-w-0 grow flex-col gap-2">
          <p className="break-all text-xs text-base-content/50">
            {value || "Nenhuma imagem selecionada."}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setModalOpen(true)}
            >
              {value ? "Mudar" : "Escolher imagem"}
            </button>
            {value ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm text-error"
                onClick={() => setValue("")}
              >
                <TrashIcon className="h-4 w-4" /> Remover
              </button>
            ) : null}
          </div>

          <input
            id={inputId}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ou cole uma URL ou caminho…"
            aria-label={`URL de ${label}`}
            className={`input input-sm w-full ${error ? "input-error" : ""}`}
          />
        </div>
      </div>

      {help ? <p className="label">{help}</p> : null}
      {error ? (
        <p className="label text-error" role="alert">
          {error}
        </p>
      ) : null}

      <MediaPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(media: MediaDto) => setValue(media.url)}
        title={`Escolher ${label.toLowerCase()}`}
      />
    </div>
  );
}
