import type { SiteSettingsDto, SocialLinks } from "./types";

/**
 * Canonical public links and address for the FICAS site.
 *
 * The API normally supplies these through `settings.social` / `settings.contact`
 * but the current dataset is empty, so the shell and the homepage fall back to
 * the values published on the old ficas.org.br site. Data always wins when
 * present, so editing settings in the admin keeps working.
 */

export const SOCIAL_FALLBACKS: SocialLinks = {
  instagram: "https://www.instagram.com/insta_ficas/",
  facebook: "https://www.facebook.com/ficas.sp",
  youtube: "",
  twitter: "https://twitter.com/FICAS_SP",
  linkedin: "https://br.linkedin.com/company/ficas",
};

/** Instagram profile used by the "Siga-nos no Instagram" calls to action. */
export const INSTAGRAM_URL = SOCIAL_FALLBACKS.instagram;

/** Merge API settings with the published fallbacks (empty values fall back). */
export function resolveSocial(settings: SiteSettingsDto | null): SocialLinks {
  const social = settings?.social;
  return {
    instagram: social?.instagram || SOCIAL_FALLBACKS.instagram,
    facebook: social?.facebook || SOCIAL_FALLBACKS.facebook,
    youtube: social?.youtube || SOCIAL_FALLBACKS.youtube,
    twitter: social?.twitter || SOCIAL_FALLBACKS.twitter,
    linkedin: social?.linkedin || SOCIAL_FALLBACKS.linkedin,
  };
}

/** Institutional address as printed in the old site footer. */
export const CONTACT_ADDRESS = {
  street: "Rua Dr. Lopes de Almeida, 180",
  district: "Vila Mariana",
  city: "São Paulo (SP)",
  postalCode: "CEP 04120-070,",
  /** Free-form query used by the homepage Google Maps embed. */
  mapQuery:
    "Rua Dr. Lopes de Almeida, 180, Vila Mariana, São Paulo - SP, 04120-070",
  phone: "(11) 3045-4313",
  whatsapp: "(11) 95816-0335",
} as const;

/**
 * Google Maps embed URL for the FICAS address. Uses the keyless `?q=…&output=embed`
 * form so the homepage map needs no API key.
 */
export function mapEmbedUrl(query: string = CONTACT_ADDRESS.mapQuery): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/**
 * Derive an embeddable Instagram URL from an admin-configured link.
 *
 * Instagram refuses framing on profile URLs (`X-Frame-Options: DENY`), but its
 * `/embed` endpoints are frameable. Accepts profile URLs, `/p|/reel|/tv/…`
 * post URLs and anything already pointing at `/embed`; other hosts, empty
 * values and unparseable input are returned unchanged.
 */
export function toInstagramEmbedUrl(url: string): string {
  const value = url?.trim();
  if (!value) return url;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return url;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "instagram.com") return url;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return url;

  // Already an embed URL: keep it as-is (query/hash included).
  if (segments.includes("embed")) return url;

  const [first, second] = segments;
  const kind = first.toLowerCase();
  if ((kind === "p" || kind === "reel" || kind === "tv") && second) {
    return `https://www.instagram.com/${kind}/${second}/embed`;
  }

  // Otherwise treat the first path segment as the username, dropping any
  // query/hash/trailing slash.
  return `https://www.instagram.com/${first}/embed`;
}

/** Digits-only phone helpers for `tel:` / `wa.me` links. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Default pt-BR message prefilled when opening a WhatsApp conversation. */
export const WHATSAPP_MESSAGE =
  "Olá! Vim pelo site do FICAS e gostaria de mais informações.";

export function whatsappHref(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/55${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
