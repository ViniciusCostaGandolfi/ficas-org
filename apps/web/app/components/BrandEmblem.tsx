/**
 * Vector recreations of the FICAS brand motifs (Sol, Espiral, Triângulos).
 *
 * Kept as standalone components so the hero carousel, the "Quem somos"
 * collage and any future surface share the exact same drawing.
 */

export function SunGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1" />
    </svg>
  );
}

/**
 * The brand symbol: the gradient spiral surrounded by its triangular "sun"
 * rays. Recreated as vector so it stays crisp and theme-aware.
 */
export function BrandEmblem({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 340"
      role="img"
      aria-label="Símbolo FICAS: espiral multicolorida cercada por triângulos nas cores azul, verde, amarela e vermelha"
      className={className}
    >
      <defs>
        <linearGradient id="brand-spiral-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0061b7" />
          <stop offset="38%" stopColor="#51ab27" />
          <stop offset="70%" stopColor="#ffac00" />
          <stop offset="100%" stopColor="#ee0302" />
        </linearGradient>
      </defs>
      <circle
        cx="160"
        cy="170"
        r="120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 8"
        className="text-primary/30"
      />
      <path
        d="M160 170a10 10 0 0 1 20 0a20 20 0 0 1-40 0a30 30 0 0 1 60 0a40 40 0 0 1-80 0a55 55 0 0 1 110 0a70 70 0 0 1-140 0"
        fill="none"
        stroke="url(#brand-spiral-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <polygon points="30,170 58,155 58,185" fill="#ffac00" />
      <polygon points="290,170 262,155 262,185" fill="#0b1220" />
      <polygon points="70,258 96,232 104,254" fill="#ee0302" />
      <polygon points="250,258 224,232 216,254" fill="#0061b7" />
      <polygon points="160,302 144,276 176,276" fill="#51ab27" />
    </svg>
  );
}
