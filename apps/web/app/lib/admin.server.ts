import type { Api } from "./api.server";
import { fromLocalInput, getOptionalString, getString } from "./format";
import {
  ApiError,
  type CampaignFormField,
  type CampaignFormSchema,
  type CampaignUpsertRequest,
  type CategoryUpsertRequest,
  type ContentFormat,
  type MediaDto,
  type PageUpsertRequest,
  type PostStatus,
  type PostUpsertRequest,
  type UserRole,
  type UserUpsertRequest,
} from "./types";

const VALID_STATUS: PostStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const VALID_ROLES: UserRole[] = ["ADMIN", "EDITOR"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseStatus(value: string): PostStatus {
  return (VALID_STATUS as string[]).includes(value)
    ? (value as PostStatus)
    : "DRAFT";
}

/** Content format control: everything that is not MARKDOWN is HTML. */
function parseContentFormat(value: string): ContentFormat {
  return value === "MARKDOWN" ? "MARKDOWN" : "HTML";
}

function parseNumberList(form: FormData, key: string): number[] {
  return form
    .getAll(key)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

/* ------------------------------------------------------------------ */
/* Payload builders (FormData → contract DTOs)                         */
/* ------------------------------------------------------------------ */

export function buildPostPayload(form: FormData): PostUpsertRequest {
  const categoryId = Number(form.get("categoryId"));
  const coverId = Number(form.get("coverMediaId"));

  return {
    title: getString(form, "title"),
    slug: getString(form, "slug"),
    excerpt: getString(form, "excerpt"),
    content: getString(form, "content"),
    contentFormat: parseContentFormat(getString(form, "contentFormat")),
    categoryId: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null,
    tagIds: parseNumberList(form, "tagIds"),
    coverMediaId: Number.isFinite(coverId) && coverId > 0 ? coverId : null,
    status: parseStatus(getString(form, "status")),
    publishedAt: fromLocalInput(getString(form, "publishedAt")),
    seoTitle: getOptionalString(form, "seoTitle"),
    seoDescription: getOptionalString(form, "seoDescription"),
  };
}

export function buildPagePayload(form: FormData): PageUpsertRequest {
  const heroId = Number(form.get("heroMediaId"));
  const menuOrder = Number(form.get("menuOrder"));

  return {
    title: getString(form, "title"),
    slug: getString(form, "slug"),
    content: getString(form, "content"),
    contentFormat: parseContentFormat(getString(form, "contentFormat")),
    excerpt: getString(form, "excerpt"),
    heroMediaId: Number.isFinite(heroId) && heroId > 0 ? heroId : null,
    menuOrder: Number.isFinite(menuOrder) ? menuOrder : 0,
    showInMenu: form.get("showInMenu") === "on" || form.get("showInMenu") === "true",
    status: parseStatus(getString(form, "status")),
    seoTitle: getOptionalString(form, "seoTitle"),
    seoDescription: getOptionalString(form, "seoDescription"),
  };
}

/** Parse the JSON produced by the campaign form builder into `formSchema`. */
function parseFormSchema(value: string): CampaignFormSchema {
  if (!value) return { fields: [] };
  try {
    const parsed = JSON.parse(value) as { fields?: unknown };
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.fields)) {
      return { fields: parsed.fields as CampaignFormField[] };
    }
  } catch {
    // Malformed payload → fall back to an empty schema instead of failing.
  }
  return { fields: [] };
}

export function buildCampaignPayload(form: FormData): CampaignUpsertRequest {
  const coverId = Number(form.get("coverMediaId"));

  return {
    title: getString(form, "title"),
    slug: getString(form, "slug"),
    description: getString(form, "description"),
    status: parseStatus(getString(form, "status")),
    startsAt: fromLocalInput(getString(form, "startsAt")),
    endsAt: fromLocalInput(getString(form, "endsAt")),
    coverMediaId: Number.isFinite(coverId) && coverId > 0 ? coverId : null,
    formSchema: parseFormSchema(getString(form, "formSchema")),
  };
}

export function buildCategoryPayload(form: FormData): CategoryUpsertRequest {
  const sortOrder = Number(form.get("sortOrder"));

  return {
    name: getString(form, "name"),
    slug: getString(form, "slug"),
    description: getOptionalString(form, "description"),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export function buildUserPayload(form: FormData): UserUpsertRequest {
  // A blank password must become `null`, never "": `UserUpsertRequest.password`
  // is annotated with `@Size(min = 6)`, so an empty string fails validation,
  // while `null` is ignored and `UserService.update` keeps the current hash.
  const password = getString(form, "password");

  return {
    name: getString(form, "name"),
    email: getString(form, "email"),
    password: password.length > 0 ? password : null,
    role: getString(form, "role") as UserRole,
  };
}

/* ------------------------------------------------------------------ */
/* Validation (client-friendly, mirrors API rules)                     */
/* ------------------------------------------------------------------ */

export function validatePost(payload: PostUpsertRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!payload.title) errors.title = "Informe o título.";
  if (!payload.slug) errors.slug = "Informe o slug.";
  return errors;
}

export function validatePage(payload: PageUpsertRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!payload.title) errors.title = "Informe o título.";
  if (!payload.slug) errors.slug = "Informe o slug.";
  return errors;
}

export function validateCampaign(
  payload: CampaignUpsertRequest,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!payload.title) errors.title = "Informe o título.";
  if (!payload.slug) {
    errors.slug = "Informe o slug.";
  } else if (!SLUG_PATTERN.test(payload.slug)) {
    errors.slug = "Use apenas letras minúsculas, números e hífens.";
  }
  if (
    payload.startsAt &&
    payload.endsAt &&
    new Date(payload.endsAt) < new Date(payload.startsAt)
  ) {
    errors.endsAt = "O fim deve ser posterior ao início.";
  }

  return errors;
}

export function validateCategory(
  payload: CategoryUpsertRequest,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!payload.name) errors.name = "Informe o nome.";
  if (!payload.slug) errors.slug = "Informe o slug.";
  return errors;
}

export function validateUser(
  payload: UserUpsertRequest,
  isEdit: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!payload.name) errors.name = "Informe o nome.";
  if (!payload.email) {
    errors.email = "Informe o e-mail.";
  } else if (!EMAIL_PATTERN.test(payload.email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (!VALID_ROLES.includes(payload.role)) {
    errors.role = "Selecione um papel válido.";
  }

  if (!isEdit) {
    if (!payload.password) {
      errors.password = "Informe a senha.";
    } else if (payload.password.length < 6) {
      errors.password = "A senha deve ter ao menos 6 caracteres.";
    }
  } else if (payload.password && payload.password.length < 6) {
    errors.password = "A senha deve ter ao menos 6 caracteres.";
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Forward an uploaded file (+ alt) from a route action to the media API. */
export async function uploadFromForm(api: Api, form: FormData): Promise<MediaDto> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError(400, {
      title: "Arquivo obrigatório",
      detail: "Selecione um arquivo para enviar.",
    });
  }

  const upload = new FormData();
  upload.set("file", file);
  const alt = getOptionalString(form, "alt");
  if (alt) upload.set("alt", alt);

  return api.upload<MediaDto>("/api/admin/media", upload);
}

export interface ActionError {
  status: number;
  body: { ok: false; message: string; fieldErrors: Record<string, string> };
}

/** Normalize any thrown error into a serializable action payload. */
export function toActionError(
  error: unknown,
  fallback = "Não foi possível concluir a operação.",
): ActionError {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        ok: false,
        message: error.problem.detail || error.problem.title || fallback,
        fieldErrors: error.fieldErrors,
      },
    };
  }
  return {
    status: 503,
    body: {
      ok: false,
      message: "Serviço indisponível no momento. Tente novamente.",
      fieldErrors: {},
    },
  };
}
