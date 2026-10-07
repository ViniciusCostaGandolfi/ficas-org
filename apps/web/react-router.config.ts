import type { Config } from "@react-router/dev/config";

/**
 * Hosts allowed to submit UI-route actions (React Router CSRF protection).
 * Values are HOST patterns (not full URLs); `*` matches one label and `**`
 * matches multiple. Behind a reverse proxy the container sees an internal
 * request host, so the public front domain must be allow-listed explicitly,
 * otherwise form submissions (login, admin CRUD, contact) fail with 400.
 *
 * Extra hosts can be supplied at build time via the comma-separated
 * `ALLOWED_ACTION_ORIGINS` env var, e.g. after swapping the domain.
 */
const extraOrigins = (process.env.ALLOWED_ACTION_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export default {
  // Framework Mode with server-side rendering enabled.
  ssr: true,
  allowedActionOrigins: [
    "ficas.vgandolfi.dev",
    "*.vgandolfi.dev",
    "localhost",
    "localhost:3000",
    "localhost:5173",
    "127.0.0.1:3000",
    "127.0.0.1:5173",
    ...extraOrigins,
  ],
} satisfies Config;
