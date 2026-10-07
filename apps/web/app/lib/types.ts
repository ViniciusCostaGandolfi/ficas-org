/**
 * TypeScript mirrors of the DTOs defined in `docs/api-contract.md`.
 *
 * Keep every field name, casing and optionality in sync with the shared
 * contract — the backend lane builds against the same document.
 */

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** RFC 7807 Problem Details as returned by the API. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Field-level validation errors, e.g. `{ "title": "must not be blank" }`. */
  errors?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(status: number, problem: ProblemDetails) {
    super(problem.detail ?? problem.title ?? `API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }

  get fieldErrors(): Record<string, string> {
    return this.problem.errors ?? {};
  }
}

/* ------------------------------------------------------------------ */
/* Pagination envelope                                                 */
/* ------------------------------------------------------------------ */

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function emptyPage<T>(size = 9): Page<T> {
  return { content: [], page: 0, size, totalElements: 0, totalPages: 0 };
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export type UserRole = "ADMIN" | "EDITOR";

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Admin create/update payload for users. `password` is optional on update:
 * `null` keeps the current hash (see `UserService.update`).
 */
export interface UserUpsertRequest {
  name: string;
  email: string;
  password: string | null;
  role: UserRole;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface SocialLinks {
  instagram: string;
  facebook: string;
  youtube: string;
  twitter: string;
  linkedin: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

export interface PixInfo {
  key: string;
  qrImageUrl: string | null;
  suggestedAmounts: number[];
}

export interface SiteSettingsDto {
  siteName: string;
  siteDescription: string;
  logoUrl: string | null;
  /**
   * Legacy favicon URL returned by the API. It is kept in the DTO for
   * compatibility but is no longer editable in the admin.
   */
  faviconUrl: string | null;
  social: SocialLinks;
  contact: ContactInfo;
  pix: PixInfo;
}

/**
 * Admin view of the settings. The public and admin settings now share a single
 * shape — there is no write-only Instagram credentials block anymore.
 */
export type AdminSiteSettingsDto = SiteSettingsDto;

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export interface MenuItemDto {
  id: number;
  label: string;
  url: string;
  target: string;
  children: MenuItemDto[];
}

export interface MenuItemUpsertRequest {
  label: string;
  url: string;
  target: string;
  sortOrder: number;
  parentId: number | null;
  children: MenuItemUpsertRequest[];
}

/* ------------------------------------------------------------------ */
/* Content format                                                      */
/* ------------------------------------------------------------------ */

/**
 * How a post/page body must be interpreted by the public renderers.
 * The API normalizes `null`/blank to `HTML`, so older records keep rendering
 * their original markup.
 */
export type ContentFormat = "HTML" | "MARKDOWN";

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export interface PageSummaryDto {
  id: number;
  slug: string;
  title: string;
  menuOrder: number;
  showInMenu: boolean;
}

export interface PageDto extends PageSummaryDto {
  content: string;
  /** Body format; `HTML`/missing means the raw markup is served as-is. */
  contentFormat?: ContentFormat | null;
  excerpt: string;
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

/**
 * Admin-facing page representation. The contract lists the endpoints and
 * `PageUpsertRequest` but not the GET response shape; we assume it extends the
 * public `PageDto` with the writable fields. Reads are defensive.
 */
export interface AdminPageDto extends PageDto {
  status?: PostStatus;
  heroMediaId?: number | null;
}

export interface AdminPageSummaryDto extends PageSummaryDto {
  status?: PostStatus;
}

export interface PageUpsertRequest {
  title: string;
  slug: string;
  content: string;
  contentFormat: ContentFormat;
  excerpt: string;
  heroMediaId: number | null;
  menuOrder: number;
  showInMenu: boolean;
  status: PostStatus;
  seoTitle: string | null;
  seoDescription: string | null;
}

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export interface CategoryDto {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

export interface CategoryUpsertRequest {
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

export interface TagDto {
  id: number;
  slug: string;
  name: string;
}

export interface TagUpsertRequest {
  name: string;
  slug: string;
}

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface AuthorDto {
  id: number;
  name: string;
}

export interface PostSummaryDto {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  category: CategoryDto | null;
  tags: TagDto[];
  author: AuthorDto | null;
  publishedAt: string | null;
}

export interface PostDto extends PostSummaryDto {
  content: string;
  /** Body format; `HTML`/missing means the raw markup is served as-is. */
  contentFormat?: ContentFormat | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin-facing post representation. The contract lists the admin endpoints and
 * `PostUpsertRequest` but does not spell out the GET response shape; we assume
 * it extends the public `PostDto` with the writable fields. Reads in the UI are
 * defensive so a slimmer payload will not crash the editor.
 */
export interface AdminPostDto extends PostDto {
  status?: PostStatus;
  categoryId?: number | null;
  coverMediaId?: number | null;
  tagIds?: number[];
}

export interface AdminPostSummaryDto extends PostSummaryDto {
  status?: PostStatus;
}

export interface PostUpsertRequest {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentFormat: ContentFormat;
  categoryId: number | null;
  tagIds: number[];
  coverMediaId: number | null;
  status: PostStatus;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

export type CampaignFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "file";

/** One input in a campaign's dynamic form (compiled into `formSchema`). */
export interface CampaignFormField {
  type: CampaignFormFieldType;
  name: string;
  label: string;
  required: boolean;
  placeholder?: string;
  help?: string;
  /** Only meaningful for `type: "select"`. */
  options?: string[];
}

export interface CampaignFormSchema {
  fields: CampaignFormField[];
}

export interface AdminCampaignDto {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: PostStatus;
  startsAt: string | null;
  endsAt: string | null;
  coverImageUrl: string | null;
  coverMediaId: number | null;
  formSchema: CampaignFormSchema | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignUpsertRequest {
  title: string;
  slug: string;
  description: string;
  status: PostStatus;
  startsAt: string | null;
  endsAt: string | null;
  coverMediaId: number | null;
  formSchema: CampaignFormSchema | null;
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export interface MediaDto {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  alt: string | null;
}

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  consent: boolean;
  source?: string;
}

export interface ContactLeadDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  source: string | null;
  consent: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Redirects (WordPress-era URL compatibility)                         */
/* ------------------------------------------------------------------ */

export interface RedirectDto {
  fromPath: string;
  toPath: string;
  statusCode: number;
}
