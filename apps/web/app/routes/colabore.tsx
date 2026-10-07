import { useState } from "react";
import { Link } from "react-router";

import { EmptyState } from "~/components/EmptyState";
import { CheckCircleIcon, PixIcon } from "~/components/Icons";
import { ImageWithFallback } from "~/components/ImageWithFallback";
import { PageHeader } from "~/components/PageHeader";
import { createApi, withFallback } from "~/lib/api.server";
import { formatCurrency } from "~/lib/format";
import { renderContentHtml } from "~/lib/markdown";
import type { PageDto } from "~/lib/types";

import type { Route } from "./+types/colabore";
import { usePublicLayoutData } from "./public-layout";

export async function loader({ request }: Route.LoaderArgs) {
  const api = createApi(request);
  const page = await withFallback(
    () => api.get<PageDto>("/api/public/pages/colabore"),
    null,
    "colabore-page",
  );
  return { page };
}

const COLABORE_DESCRIPTION =
  "Apoie as iniciativas da FICAS e colabore com a transformação de pessoas e organizações.";

export const meta: Route.MetaFunction = () => [
  { title: "Colabore — FICAS" },
  { name: "description", content: COLABORE_DESCRIPTION },
  { property: "og:title", content: "Colabore — FICAS" },
  { property: "og:description", content: COLABORE_DESCRIPTION },
];

function CopyKeyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context) — ignore silently.
    }
  }

  return (
    <button
      type="button"
      className={`btn ${copied ? "btn-success" : "btn-primary"}`}
      onClick={handleCopy}
    >
      {copied ? <CheckCircleIcon className="h-4 w-4" /> : null}
      {copied ? "Chave copiada!" : "Copiar chave"}
    </button>
  );
}

export default function Colabore({ loaderData }: Route.ComponentProps) {
  const layout = usePublicLayoutData();
  const pix = layout?.settings?.pix;

  return (
    <div className="flex flex-col gap-10">
      <div className="breadcrumbs text-sm text-base-content/60">
        <ul>
          <li>
            <Link to="/" className="link link-hover">
              Início
            </Link>
          </li>
          <li>Colabore</li>
        </ul>
      </div>

      <PageHeader
        eyebrow="Faça parte"
        title="Colabore"
        lead="Apoie as iniciativas da FICAS e ajude a ampliar o acesso ao conhecimento."
      />

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          {loaderData.page ? (
            <div
              className="cms-content prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: renderContentHtml(
                  loaderData.page.content,
                  loaderData.page.contentFormat,
                ),
              }}
            />
          ) : (
            <EmptyState
              title="Página em preparação"
              description="O conteúdo desta página será publicado em breve."
            />
          )}
        </div>

        <section className="surface-mesh rounded-3xl border border-base-300/70 p-6 sm:p-8 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-box bg-secondary/10 text-secondary">
              <PixIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                Doação
              </p>
              <h2 className="font-display text-2xl font-semibold">
                Doe via Pix
              </h2>
            </div>
          </div>

          {pix?.key ? (
            <div className="mt-6 flex flex-col gap-6">
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-base-300 bg-base-100 p-2 shadow-sm">
                <ImageWithFallback
                  src={pix.qrImageUrl}
                  alt="QR Code para doação via Pix"
                  className="h-full w-full object-contain"
                  fallback={<PixIcon className="h-16 w-16 text-base-content/20" />}
                />
              </div>

              <div>
                <p className="label">
                  <span className="text-sm font-medium">Chave Pix</span>
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    readOnly
                    value={pix.key}
                    aria-label="Chave Pix"
                    className="input w-full font-mono text-sm"
                  />
                  <CopyKeyButton value={pix.key} />
                </div>
              </div>

              {pix.suggestedAmounts && pix.suggestedAmounts.length > 0 ? (
                <div>
                  <p className="label">
                    <span className="text-sm font-medium">
                      Valores sugeridos
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pix.suggestedAmounts.map((amount) => (
                      <span
                        key={amount}
                        className="rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-sm font-semibold text-primary"
                      >
                        {formatCurrency(amount)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-base-content/70">
              Nenhuma chave Pix cadastrada ainda. As informações de doação podem
              ser configuradas no painel administrativo.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
