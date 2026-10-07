import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";

import { BrandEmblem } from "./BrandEmblem";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { ImageWithFallback } from "./ImageWithFallback";

export type HeroSlideVariant =
  | "brand"
  | "primary"
  | "secondary"
  | "accent"
  | "image";

export interface HeroSlideCta {
  label: string;
  to: string;
}

export interface HeroSlide {
  id: string;
  /** Accessible name for the slide (used by the bullets). */
  label: string;
  variant: HeroSlideVariant;
  /** Small kicker rendered inside the white overlay card. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  imageUrl?: string | null;
  imageAlt?: string;
  /** CSS `object-position` for the background photo. */
  imagePosition?: string;
  primaryCta?: HeroSlideCta;
  secondaryCta?: HeroSlideCta;
  highlights?: string[];
}

export interface HeroCarouselProps {
  slides: HeroSlide[];
  className?: string;
  /** Autoplay is skipped automatically when reduced motion is requested. */
  autoplay?: boolean;
  intervalMs?: number;
}

const DEFAULT_INTERVAL = 5000;

const VARIANT_SURFACE: Record<HeroSlideVariant, string> = {
  brand: "surface-ink text-primary-content",
  primary: "bg-primary text-primary-content",
  secondary: "bg-secondary text-secondary-content",
  accent: "bg-accent text-accent-content",
  image: "bg-neutral text-neutral-content",
};

const VARIANT_EYEBROW: Record<HeroSlideVariant, string> = {
  brand: "border-accent/30 bg-accent/15 text-accent",
  primary: "border-primary-content/25 bg-primary-content/10 text-primary-content",
  secondary:
    "border-secondary-content/25 bg-secondary-content/10 text-secondary-content",
  accent: "border-accent-content/25 bg-accent-content/10 text-accent-content",
  image: "border-accent/40 bg-accent/15 text-accent-content",
};

const VARIANT_MUTED: Record<HeroSlideVariant, string> = {
  brand: "text-primary-content/80",
  primary: "text-primary-content/85",
  secondary: "text-secondary-content/85",
  accent: "text-accent-content/85",
  image: "text-base-content/70",
};

const VARIANT_CHIP: Record<HeroSlideVariant, string> = {
  brand: "bg-primary-content/10 text-primary-content/85",
  primary: "bg-primary-content/15 text-primary-content/90",
  secondary: "bg-secondary-content/10 text-secondary-content/85",
  accent: "bg-accent-content/10 text-accent-content/85",
  image: "bg-base-content/5 text-base-content/75",
};

const VARIANT_PRIMARY_CTA: Record<HeroSlideVariant, string> = {
  brand: "btn-accent",
  primary: "btn-accent",
  secondary: "btn-neutral",
  accent: "btn-neutral",
  image: "btn-primary",
};

const VARIANT_SECONDARY_CTA: Record<HeroSlideVariant, string> = {
  brand: "btn-accent",
  primary: "btn-accent",
  secondary: "btn-neutral",
  accent: "btn-neutral",
  image: "btn-outline",
};

const VARIANT_INK: Record<HeroSlideVariant, string> = {
  brand: "text-primary-content",
  primary: "text-primary-content",
  secondary: "text-secondary-content",
  accent: "text-accent-content",
  image: "text-primary-content",
};

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

function Slide({
  slide,
  index,
  total,
  isFirst,
}: {
  slide: HeroSlide;
  index: number;
  total: number;
  isFirst: boolean;
}) {
  const Heading = isFirst ? "h1" : "h2";
  const isImage = slide.variant === "image";

  // Full-bleed photographic slide with a floating white card, matching the
  // old site's homepage slider.
  if (isImage) {
    return (
      <li
        className="carousel-item w-full"
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} de ${total}: ${slide.label}`}
      >
        <article className="relative flex min-h-[24rem] w-full items-center overflow-hidden bg-neutral sm:min-h-[30rem] lg:min-h-[34rem]">
          <ImageWithFallback
            src={slide.imageUrl}
            alt={slide.imageAlt ?? ""}
            loading={isFirst ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover"
            style={slide.imagePosition ? { objectPosition: slide.imagePosition } : undefined}
            fallback={
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-brand-gradient opacity-90"
              />
            }
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-neutral/75 via-neutral/35 to-transparent"
          />

          <div className="relative z-10 w-full px-4 py-12 sm:px-10 lg:px-14">
            <div className="max-w-xl rounded-3xl bg-base-100/95 p-6 shadow-2xl ring-1 ring-base-content/5 backdrop-blur-sm sm:p-9">
              {slide.eyebrow ? (
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${VARIANT_EYEBROW[slide.variant]}`}
                >
                  <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-current" />
                  {slide.eyebrow}
                </span>
              ) : null}

              <Heading className="display-tight mt-3 text-3xl font-black text-base-content sm:text-4xl lg:text-5xl">
                {slide.title}
              </Heading>

              {slide.description ? (
                <p className="mt-4 text-base leading-relaxed text-base-content/70 sm:text-lg">
                  {slide.description}
                </p>
              ) : null}

              {slide.highlights && slide.highlights.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {slide.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${VARIANT_CHIP[slide.variant]}`}
                    >
                      {highlight}
                    </li>
                  ))}
                </ul>
              ) : null}

              {slide.primaryCta || slide.secondaryCta ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {slide.primaryCta ? (
                    <Link
                      to={slide.primaryCta.to}
                      className={`btn ${VARIANT_PRIMARY_CTA[slide.variant]}`}
                    >
                      {slide.primaryCta.label}
                    </Link>
                  ) : null}
                  {slide.secondaryCta ? (
                    <Link
                      to={slide.secondaryCta.to}
                      className={`btn ${VARIANT_SECONDARY_CTA[slide.variant]}`}
                    >
                      {slide.secondaryCta.label}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </article>
      </li>
    );
  }

  return (
    <li
      className="carousel-item w-full"
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} de ${total}: ${slide.label}`}
    >
      <article
        className={`relative flex min-h-[24rem] w-full items-center overflow-hidden sm:min-h-[30rem] lg:min-h-[34rem] ${VARIANT_SURFACE[slide.variant]}`}
      >
        <div
          aria-hidden="true"
          className="pattern-spiral absolute inset-y-0 right-0 hidden w-2/5 opacity-[0.08] lg:block"
        />

        <div className="relative z-10 grid w-full items-center gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
          <div className="flex max-w-2xl flex-col items-start gap-5">
            {slide.eyebrow ? (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur ${VARIANT_EYEBROW[slide.variant]}`}
              >
                <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-current" />
                {slide.eyebrow}
              </span>
            ) : null}

            <Heading className="display-tight text-3xl font-black sm:text-4xl lg:text-5xl">
              {slide.title}
            </Heading>

            {slide.description ? (
              <p
                className={`text-base leading-relaxed sm:text-lg ${VARIANT_MUTED[slide.variant]}`}
              >
                {slide.description}
              </p>
            ) : null}

            {slide.highlights && slide.highlights.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {slide.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${VARIANT_CHIP[slide.variant]}`}
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : null}

            {slide.primaryCta || slide.secondaryCta ? (
              <div className="flex flex-wrap gap-3 pt-1">
                {slide.primaryCta ? (
                  <Link
                    to={slide.primaryCta.to}
                    className={`btn btn-lg ${VARIANT_PRIMARY_CTA[slide.variant]}`}
                  >
                    {slide.primaryCta.label}
                  </Link>
                ) : null}
                {slide.secondaryCta ? (
                  <Link
                    to={slide.secondaryCta.to}
                    className={`btn btn-outline btn-lg ${VARIANT_SECONDARY_CTA[slide.variant]}`}
                  >
                    {slide.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto hidden w-full max-w-sm lg:block"
          >
            <BrandEmblem className="h-auto w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.3)]" />
          </div>
        </div>
      </article>
    </li>
  );
}

/**
 * Full-width daisyUI carousel used as the home hero.
 *
 * CSS/scroll based — no runtime dependency. Controls, dots and keyboard
 * navigation are fully client-side but SSR-safe (the markup renders on the
 * server and hydrates into the interactive version).
 */
export function HeroCarousel({
  slides,
  className = "",
  autoplay = true,
  intervalMs = DEFAULT_INTERVAL,
}: HeroCarouselProps) {
  const count = slides.length;
  const trackRef = useRef<HTMLUListElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const scrollToIndex = useCallback(
    (target: number, behavior: ScrollBehavior) => {
      const track = trackRef.current;
      if (!track) return;
      track.scrollTo({ left: target * track.clientWidth, behavior });
    },
    [],
  );

  const goTo = useCallback(
    (target: number) => {
      if (count <= 0) return;
      const next = ((target % count) + count) % count;
      indexRef.current = next;
      setIndex(next);
      scrollToIndex(next, reducedMotion ? "auto" : "smooth");
    },
    [count, reducedMotion, scrollToIndex],
  );

  const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(indexRef.current - 1), [goTo]);

  // Keep the active dot in sync when the user swipes or scrolls the track.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count <= 1) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = track.clientWidth;
        if (!width) return;
        const current = Math.round(track.scrollLeft / width);
        if (current >= 0 && current < count && current !== indexRef.current) {
          indexRef.current = current;
          setIndex(current);
        }
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  // Re-align instantly after a viewport resize.
  useEffect(() => {
    const onResize = () => scrollToIndex(indexRef.current, "auto");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [scrollToIndex]);

  // Autoplay — off for reduced motion, single slides, and when paused.
  useEffect(() => {
    if (!autoplay || reducedMotion || count <= 1 || paused) return;
    const id = window.setInterval(next, intervalMs);
    return () => window.clearInterval(id);
  }, [autoplay, reducedMotion, count, paused, intervalMs, next]);

  // Pause while the tab is in the background.
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
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(count - 1);
    }
  };

  if (count === 0) return null;

  const activeVariant = slides[index]?.variant ?? "brand";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destaques do FICAS"
      className={`relative overflow-hidden rounded-3xl ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <p className="sr-only" aria-live="polite">
        {`Slide ${index + 1} de ${count}`}
      </p>

      <ul ref={trackRef} className="carousel w-full">
        {slides.map((slide, i) => (
          <Slide
            key={slide.id}
            slide={slide}
            index={i}
            total={count}
            isFirst={i === 0}
          />
        ))}
      </ul>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Slide anterior"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-base-300 bg-base-100/80 text-base-content shadow-md backdrop-blur transition hover:bg-base-100 hover:text-primary sm:left-4"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Próximo slide"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-base-300 bg-base-100/80 text-base-content shadow-md backdrop-blur transition hover:bg-base-100 hover:text-primary sm:right-4"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>

          <div
            className={`absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-neutral/45 px-3 py-2 backdrop-blur-sm ${VARIANT_INK[activeVariant]}`}
          >
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir para o slide ${i + 1}: ${slide.label}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-2.5 rounded-full bg-current transition-all ${
                  i === index
                    ? "w-7 opacity-100"
                    : "w-2.5 opacity-50 hover:opacity-80"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
