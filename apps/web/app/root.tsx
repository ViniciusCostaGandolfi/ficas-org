import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";

import type { Route } from "./+types/root";
import { resolveMediaUrl } from "./lib/media";
import "./tailwind.css";

const FAVICON = "/favicon.ico";
const APPLE_TOUCH_ICON = "/brand/logo-ficas.png";

// Public site origin, used to build absolute URLs for social/WhatsApp previews.
// Override at build time with VITE_SITE_URL (e.g. after a domain swap).
const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ??
  "https://ficas.vgandolfi.dev"
).replace(/\/+$/, "");
const SITE_NAME = "FICAS";
const SITE_DESCRIPTION =
  "Compartilhando conhecimentos, transformando pessoas e organizações.";
const OG_IMAGE = `${SITE_URL}/brand/og-image.png`;

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: resolveMediaUrl(FAVICON) ?? FAVICON, type: "image/x-icon" },
  { rel: "apple-touch-icon", href: resolveMediaUrl(APPLE_TOUCH_ICON) ?? APPLE_TOUCH_ICON },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap",
  },
];

export const meta: Route.MetaFunction = ({ location }) => {
  const pageUrl = `${SITE_URL}${location.pathname}`;
  return [
    { title: SITE_NAME },
    { name: "description", content: SITE_DESCRIPTION },
    { tagName: "link", rel: "canonical", href: pageUrl },

    // Open Graph (WhatsApp, Facebook, Telegram, LinkedIn…)
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:url", content: pageUrl },
    { property: "og:title", content: SITE_NAME },
    { property: "og:description", content: SITE_DESCRIPTION },
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:secure_url", content: OG_IMAGE },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: SITE_NAME },

    // Twitter/X card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: SITE_NAME },
    { name: "twitter:description", content: SITE_DESCRIPTION },
    { name: "twitter:image", content: OG_IMAGE },
  ];
};

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="ficas">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0061b7" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col bg-base-100 text-base-content antialiased">
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-box bg-primary px-4 py-2 font-semibold text-primary-content focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  let status = 500;
  let title = "Algo deu errado";
  let detail =
    "Não foi possível carregar este conteúdo agora. Tente novamente em instantes.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "Página não encontrada";
      detail = "O endereço acessado não existe ou foi movido.";
    } else {
      title = error.statusText || title;
      detail = typeof error.data === "string" ? error.data : detail;
    }
  }

  return (
    <main
      id="main-content"
      className="surface-mesh flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <p className="font-display text-7xl font-black leading-none text-primary">
        {status}
      </p>
      <div className="brand-rule w-24 rounded-full" />
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-md text-base-content/70">{detail}</p>
      <a href="/" className="btn btn-primary btn-lg">
        Voltar para a página inicial
      </a>
    </main>
  );
}
