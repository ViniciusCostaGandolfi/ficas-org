import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { resolveMediaUrl } from "~/lib/media";

export type BrandMarkTone = "default" | "white";

export interface BrandMarkProps {
  /**
   * Optional logo image (e.g. from `SiteSettingsDto.logoUrl`). Falls back to
   * the bundled FICAS brand asset when absent or broken.
   */
  logoUrl?: string | null;
  siteName?: string;
  /** Short institutional line shown next to the mark on wider viewports. */
  tagline?: string;
  /** Visual scale. `md`/`lg` respect the brand's ~70px minimum height. */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Render as plain markup instead of a link (e.g. inside the admin sidebar). */
  asLink?: boolean;
  /** Force the white logo, for dark or colored surfaces. */
  tone?: BrandMarkTone;
}

const DEFAULT_LOGO = "/brand/logo-ficas.png";
const WHITE_LOGO = "/brand/logo-ficas-branco.png";

const SIZES = {
  // `sm` is only for tightly constrained UI; prefer `md` for the brand minimum.
  sm: { logo: "h-12", gap: "gap-3", tagline: "text-[0.6rem]" },
  md: { logo: "h-[70px]", gap: "gap-3", tagline: "text-[0.64rem]" },
  lg: { logo: "h-[88px]", gap: "gap-3", tagline: "text-[0.7rem]" },
} as const;

export function BrandMark({
  logoUrl,
  siteName = "FICAS",
  tagline,
  size = "md",
  className = "",
  asLink = true,
  tone = "default",
}: BrandMarkProps) {
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const s = SIZES[size];

  const src =
    resolveMediaUrl(logoUrl) || (tone === "white" ? WHITE_LOGO : DEFAULT_LOGO);

  // The image may have failed before hydration, so onError alone is not enough.
  useEffect(() => {
    setBroken(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setBroken(true);
    }
  }, [src]);

  const content = (
    <>
      {!broken ? (
        <img
          ref={imgRef}
          src={src}
          alt={siteName}
          onError={() => setBroken(true)}
          className={`${s.logo} w-auto shrink-0 object-contain`}
        />
      ) : (
        // Graceful fallback when no logo can be loaded.
        <span
          aria-hidden="true"
          className={`${s.logo} flex aspect-square shrink-0 items-center justify-center rounded-box bg-brand-gradient font-display text-2xl font-black text-white`}
        >
          F
        </span>
      )}

      {tagline ? (
        <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
          <span
            className={`font-display font-semibold uppercase tracking-[0.14em] text-base-content/65 ${s.tagline}`}
          >
            {tagline}
          </span>
        </span>
      ) : null}
    </>
  );

  const classes = `inline-flex items-center rounded-field ${s.gap} ${className}`;

  if (!asLink) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link
      to="/"
      className={`${classes} transition-opacity hover:opacity-90`}
      aria-label={`${siteName} — página inicial`}
    >
      {content}
    </Link>
  );
}
