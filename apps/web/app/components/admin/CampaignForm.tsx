import { useMemo, useState } from "react";
import { Form, Link } from "react-router";

import { toLocalInput } from "~/lib/format";
import type {
  AdminCampaignDto,
  CampaignFormField,
  CampaignFormFieldType,
  PostStatus,
} from "~/lib/types";

import { Alert } from "../Alert";
import { FormField } from "../FormField";
import { PlusIcon, TrashIcon } from "../Icons";
import { MediaField } from "./MediaField";

export interface CampaignFormProps {
  mode: "create" | "edit";
  campaign?: AdminCampaignDto | null;
  fieldErrors?: Record<string, string>;
  message?: string;
  ok?: boolean;
}

const FIELD_TYPE_OPTIONS: ReadonlyArray<{
  value: CampaignFormFieldType;
  label: string;
}> = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "checkbox", label: "Caixa de seleção" },
  { value: "file", label: "Arquivo" },
];

const FIELD_TYPE_LABEL = Object.fromEntries(
  FIELD_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<CampaignFormFieldType, string>;

function emptyField(): CampaignFormField {
  return { type: "text", name: "", label: "", required: false };
}

/** Serialize the builder state into the exact contract shape. */
function compileSchema(fields: CampaignFormField[]): {
  fields: CampaignFormField[];
} {
  return {
    fields: fields.map((field) => {
      const compiled: CampaignFormField = {
        type: field.type,
        name: field.name.trim(),
        label: field.label.trim(),
        required: field.required,
      };
      const placeholder = field.placeholder?.trim();
      if (placeholder) compiled.placeholder = placeholder;
      const help = field.help?.trim();
      if (help) compiled.help = help;
      if (field.type === "select") {
        const options = (field.options ?? []).map((o) => o.trim()).filter(Boolean);
        if (options.length > 0) compiled.options = options;
      }
      return compiled;
    }),
  };
}

export function CampaignForm({
  mode,
  campaign,
  fieldErrors = {},
  message,
  ok,
}: CampaignFormProps) {
  const [coverId, setCoverId] = useState(
    campaign?.coverMediaId ? String(campaign.coverMediaId) : "",
  );
  const [slug, setSlug] = useState(campaign?.slug ?? "");
  const [fields, setFields] = useState<CampaignFormField[]>(
    campaign?.formSchema?.fields ?? [],
  );

  const compiled = useMemo(() => compileSchema(fields), [fields]);
  const serialized = useMemo(() => JSON.stringify(compiled), [compiled]);
  const previewJson = useMemo(
    () => JSON.stringify(compiled, null, 2),
    [compiled],
  );

  function addField() {
    setFields((current) => [...current, emptyField()]);
  }

  function removeField(index: number) {
    setFields((current) => current.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateField(index: number, patch: Partial<CampaignFormField>) {
    setFields((current) =>
      current.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {message ? <Alert status={ok ? "success" : "error"}>{message}</Alert> : null}

      <MediaField
        name="coverMediaId"
        label="Imagem de capa"
        imageUrl={campaign?.coverImageUrl ?? null}
        error={fieldErrors.coverMediaId}
        onChange={setCoverId}
      />

      <Form method="post" className="card min-w-0 border border-base-300 bg-base-100">
        <div className="card-body min-w-0 gap-6">
          <input type="hidden" name="intent" value="save" />
          <input type="hidden" name="coverMediaId" value={coverId} />
          <input type="hidden" name="formSchema" value={serialized} />

          <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-2">
            <FormField
              label="Título"
              name="title"
              required
              defaultValue={campaign?.title ?? ""}
              error={fieldErrors.title}
            />
            <FormField
              label="Slug"
              name="slug"
              required
              value={slug}
              onChange={setSlug}
              help="Identificador na URL: /campanhas/{slug}"
              error={fieldErrors.slug}
            />
          </div>

          <FormField
            label="Descrição"
            name="description"
            as="textarea"
            rows={3}
            defaultValue={campaign?.description ?? ""}
            error={fieldErrors.description}
          />

          <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-3">
            <FormField
              label="Status"
              name="status"
              as="select"
              defaultValue={(campaign?.status ?? "DRAFT") as PostStatus}
              error={fieldErrors.status}
            >
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
            </FormField>

            <FormField
              label="Início"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalInput(campaign?.startsAt)}
              error={fieldErrors.startsAt}
            />

            <FormField
              label="Fim"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInput(campaign?.endsAt)}
              error={fieldErrors.endsAt}
            />
          </div>

          <fieldset className="fieldset min-w-0 grid-cols-1 rounded-box border border-base-300 p-4">
            <legend className="fieldset-legend">
              Formulário da campanha
            </legend>
            <p className="mb-2 text-sm text-base-content/60">
              Monte os campos que serão exibidos no formulário público de
              inscrição.
            </p>

            {fields.length > 0 ? (
              <div className="flex min-w-0 flex-col gap-4">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="min-w-0 rounded-box border border-base-300 bg-base-200/40 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-ghost badge-sm">
                          Campo {index + 1}
                        </span>
                        <span className="badge badge-primary badge-outline badge-sm">
                          {FIELD_TYPE_LABEL[field.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => moveField(index, -1)}
                          disabled={index === 0}
                          aria-label={`Mover campo ${index + 1} para cima`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => moveField(index, 1)}
                          disabled={index === fields.length - 1}
                          aria-label={`Mover campo ${index + 1} para baixo`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => removeField(index)}
                          aria-label={`Remover campo ${index + 1}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:grid-cols-2">
                      <div>
                        <label
                          className="label"
                          htmlFor={`field-type-${index}`}
                        >
                          <span className="text-sm font-medium">Tipo</span>
                        </label>
                        <select
                          id={`field-type-${index}`}
                          value={field.type}
                          onChange={(event) =>
                            updateField(index, {
                              type: event.target
                                .value as CampaignFormFieldType,
                            })
                          }
                          className="select w-full"
                        >
                          {FIELD_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          className="label"
                          htmlFor={`field-name-${index}`}
                        >
                          <span className="text-sm font-medium">Nome</span>
                        </label>
                        <input
                          id={`field-name-${index}`}
                          type="text"
                          value={field.name}
                          onChange={(event) =>
                            updateField(index, { name: event.target.value })
                          }
                          placeholder="nome_completo"
                          className="input w-full font-mono text-sm"
                        />
                        <p className="mt-1 text-xs text-base-content/55">
                          Identificador em snake_case (ex.: nome_completo).
                        </p>
                      </div>

                      <div>
                        <label
                          className="label"
                          htmlFor={`field-label-${index}`}
                        >
                          <span className="text-sm font-medium">
                            Rótulo
                          </span>
                        </label>
                        <input
                          id={`field-label-${index}`}
                          type="text"
                          value={field.label}
                          onChange={(event) =>
                            updateField(index, { label: event.target.value })
                          }
                          placeholder="Nome completo"
                          className="input w-full"
                        />
                      </div>

                      <div>
                        <label
                          className="label"
                          htmlFor={`field-placeholder-${index}`}
                        >
                          <span className="text-sm font-medium">
                            Placeholder (opcional)
                          </span>
                        </label>
                        <input
                          id={`field-placeholder-${index}`}
                          type="text"
                          value={field.placeholder ?? ""}
                          onChange={(event) =>
                            updateField(index, {
                              placeholder: event.target.value,
                            })
                          }
                          className="input w-full"
                        />
                      </div>

                      <div>
                        <label
                          className="label"
                          htmlFor={`field-help-${index}`}
                        >
                          <span className="text-sm font-medium">
                            Ajuda (opcional)
                          </span>
                        </label>
                        <input
                          id={`field-help-${index}`}
                          type="text"
                          value={field.help ?? ""}
                          onChange={(event) =>
                            updateField(index, { help: event.target.value })
                          }
                          className="input w-full"
                        />
                      </div>

                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={field.required}
                            onChange={(event) =>
                              updateField(index, {
                                required: event.target.checked,
                              })
                            }
                          />
                          Obrigatório
                        </label>
                      </div>

                      {field.type === "select" ? (
                        <div className="lg:col-span-2">
                          <label
                            className="label"
                            htmlFor={`field-options-${index}`}
                          >
                            <span className="text-sm font-medium">
                              Opções
                            </span>
                          </label>
                          <textarea
                            id={`field-options-${index}`}
                            rows={3}
                            value={(field.options ?? []).join("\n")}
                            onChange={(event) =>
                              updateField(index, {
                                options: event.target.value.split("\n"),
                              })
                            }
                            placeholder={"Opção 1\nOpção 2"}
                            className="textarea w-full font-mono text-sm"
                          />
                          <p className="mt-1 text-xs text-base-content/55">Uma opção por linha.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-center text-sm text-base-content/60">
                Nenhum campo adicionado. Use o botão abaixo para começar.
              </p>
            )}

            <div className="mt-4">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={addField}
              >
                <PlusIcon className="h-4 w-4" /> Adicionar campo
              </button>
            </div>
          </fieldset>

          <details className="collapse collapse-arrow rounded-box border border-base-300 bg-base-100">
            <summary className="collapse-title min-h-0 py-3 text-sm font-medium">
              Ver JSON do formulário
            </summary>
            <div className="collapse-content">
              <pre className="max-h-80 overflow-auto rounded-box bg-neutral p-4 text-xs leading-relaxed text-neutral-content">
                <code>{previewJson}</code>
              </pre>
            </div>
          </details>

          <div className="flex flex-wrap justify-end gap-2">
            <Link to="/admin/campaigns" className="btn btn-ghost">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary">
              {mode === "create" ? "Criar campanha" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
}
