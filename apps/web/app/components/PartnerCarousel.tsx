import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { ImageWithFallback } from "./ImageWithFallback";

export interface PartnerLogo {
  src: string;
  alt: string;
}

export interface PartnerCarouselProps {
  logos: PartnerLogo[];
  className?: string;
  intervalMs?: number;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Autoplaying daisyUI carousel for the partner logos.
 *
 * Scroll-snap based (no runtime dependency) and SSR-safe: the markup renders on
 * the server and hydrates into the interactive version. Autoplay is skipped
 * when the visitor asks for reduced motion and while hovers/focus are active.
 */
export function PartnerCarousel({
  logos,
  className = "",
  intervalMs = 3200,
}: PartnerCarouselProps) {
  const count = logos.length;
  const trackRef = useRef<HTMLUListElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const scrollToItem = useCallback(
    (target: number, behavior: ScrollBehavior) => {
      const track = trackRef.current;
      if (!track) return;
      const item = track.children[target] as HTMLElement | undefined;
      if (!item) return;
      track.scrollTo({ left: item.offsetLeft, behavior });
    },
    [],
  );

  const goTo = useCallback(
    (target: number) => {
      if (count <= 0) return;
      const next = ((target % count) + count) % count;
      indexRef.current = next;
      setIndex(next);
      scrollToItem(next, reducedMotion ? "auto" : "smooth");
    },
    [count, reducedMotion, scrollToItem],
  );

  const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(indexRef.current - 1), [goTo]);

  // Keep the active dot in sync when the visitor scrolls or swipes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count <= 1) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const children = Array.from(track.children) as HTMLElement[];
        const center = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        let best = Number.POSITIVE_INFINITY;
        children.forEach((child, i) => {
          const distance = Math.abs(child.offsetLeft + child.clientWidth / 2 - center);
          if (distance < best) {
            best = distance;
            closest = i;
          }
        });
        if (closest !== indexRef.current) {
          indexRef.current = closest;
          setIndex(closest);
        }
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  useEffect(() => {
    if (reducedMotion || count <= 1 || paused) return;
    const id = window.setInterval(next, intervalMs);
    return () => window.clearInterval(id);
  }, [reducedMotion, count, paused, intervalMs, next]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (count <= 1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    }
  };

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Parceiros do FICAS"
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <ul
        ref={trackRef}
        className="carousel w-full gap-4 rounded-box"
        aria-live="off"
      >
        {logos.map((logo, i) => (
          <li
            key={logo.src}
            className="carousel-item w-1/2 shrink-0 sm:w-1/3 lg:w-1/4"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${count}`}
          >
            <div className="flex h-28 w-full items-center justify-center rounded-box border border-base-300 bg-base-100 px-6 py-5 sm:h-32">
              <ImageWithFallback
                src={logo.src}
                alt={logo.alt}
                className="max-h-16 w-auto max-w-full object-contain"
                fallback={
                  <span className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
                    Parceiro
                  </span>
                }
              />
            </div>
          </li>
        ))}
      </ul>

      {count > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Parceiro anterior"
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          <div className="flex gap-2">
            {logos.map((logo, i) => (
              <button
                key={logo.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir para o parceiro ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-2 rounded-full bg-primary transition-all ${
                  i === index ? "w-6 opacity-100" : "w-2 opacity-30 hover:opacity-60"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Próximo parceiro"
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
