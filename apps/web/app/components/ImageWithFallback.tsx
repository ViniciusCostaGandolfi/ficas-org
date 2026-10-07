import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { resolveMediaUrl } from "~/lib/media";

import { ImageIcon } from "./Icons";

export interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
  /** Rendered when the source is missing or fails to load. */
  fallback?: ReactNode;
}

const DEFAULT_FALLBACK = (
  <div className="flex h-full w-full items-center justify-center text-base-content/25">
    <ImageIcon className="h-10 w-10" />
  </div>
);

/**
 * <img> that swaps to a fallback when the media URL is missing or broken.
 * Checks on mount too, because the error event can fire before hydration.
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  style,
  loading = "lazy",
  fallback = DEFAULT_FALLBACK,
}: ImageWithFallbackProps) {
  // Resolve `/media/**` paths to the API origin before rendering.
  const resolved = resolveMediaUrl(src);
  const [broken, setBroken] = useState(!resolved);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setBroken(!resolved);
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setBroken(true);
    }
  }, [resolved]);

  if (broken || !resolved) return <>{fallback}</>;

  return (
    <img
      ref={ref}
      src={resolved}
      alt={alt}
      loading={loading}
      className={className}
      style={style}
      onError={() => setBroken(true)}
    />
  );
}
