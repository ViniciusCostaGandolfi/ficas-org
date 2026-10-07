import { useMemo, useRef, useState } from "react";

import type { TagDto } from "~/lib/types";

export interface TagMultiSelectProps {
  tags: TagDto[];
  /** Tag ids already attached to the post (stringified for easy `Set` lookup). */
  selectedIds: Set<string>;
  error?: string;
}

/** Accent-insensitive, case-insensitive normalisation for the filter. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Searchable multi-select for post tags.
 *
 * Submission contract: every checkbox is
 * `<input type="checkbox" name="tagIds" value={tag.id} defaultChecked=…>`, so
 * the server keeps reading them with `formData.getAll("tagIds")`. The checkboxes
 * are uncontrolled; the bulk actions ("Limpar", "Selecionar visíveis") toggle
 * them through refs instead of React state, and a parallel `selected` set only
 * drives the counter.
 */
export function TagMultiSelect({ tags, selectedIds, error }: TagMultiSelectProps) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedIds),
  );
  const checkboxRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const query = normalize(filter.trim());
  // Every checkbox stays mounted so a filtered view still submits all checked
  // tags; the filter only toggles row visibility.
  const matches = (tag: TagDto) => !query || normalize(tag.name).includes(query);
  const visible = useMemo(
    () => tags.filter((tag) => matches(tag)),
    [tags, query],
  );

  function registerRef(id: number, element: HTMLInputElement | null) {
    if (element) {
      checkboxRefs.current.set(id, element);
    } else {
      checkboxRefs.current.delete(id);
    }
  }

  function toggle(id: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(String(id));
      else next.delete(String(id));
      return next;
    });
  }

  function clearAll() {
    checkboxRefs.current.forEach((element) => {
      element.checked = false;
    });
    setSelected(new Set());
  }

  function selectVisible() {
    setSelected((current) => {
      const next = new Set(current);
      visible.forEach((tag) => {
        const element = checkboxRefs.current.get(tag.id);
        if (element) element.checked = true;
        next.add(String(tag.id));
      });
      return next;
    });
  }

  if (tags.length === 0) {
    return (
      <div>
        <p className="mb-1 text-sm font-medium">Tags</p>
        <p className="text-sm text-base-content/60">
          Nenhuma tag cadastrada ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="label" htmlFor="tag-filter">
          <span className="text-sm font-medium">Tags</span>
        </label>
        <span className="text-xs font-medium text-base-content/60">
          Selecionadas ({selected.size})
        </span>
      </div>

      <input
        id="tag-filter"
        type="search"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtrar tags…"
        className="input input-sm w-full"
        autoComplete="off"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={clearAll}
          disabled={selected.size === 0}
        >
          Limpar
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={selectVisible}
          disabled={visible.length === 0}
        >
          Selecionar visíveis
        </button>
      </div>

      <div className="mt-2 max-h-56 overflow-y-auto rounded-box border border-base-300 p-2">
        {tags.map((tag) => (
          <label
            key={tag.id}
            className={`label flex cursor-pointer justify-start gap-3 py-1 ${
              matches(tag) ? "" : "hidden"
            }`}
          >
            <input
              type="checkbox"
              name="tagIds"
              value={tag.id}
              defaultChecked={selectedIds.has(String(tag.id))}
              ref={(element) => registerRef(tag.id, element)}
              onChange={(event) => toggle(tag.id, event.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">{tag.name}</span>
          </label>
        ))}
        {visible.length === 0 ? (
          <p className="px-2 py-1 text-sm text-base-content/60">
            Nenhuma tag encontrada para “{filter.trim()}”.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1 text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
