import { data, Form, Link, redirect, useNavigation, useSearchParams } from "react-router";

import { Alert } from "~/components/Alert";
import { BrandMark } from "~/components/BrandMark";
import { FormField } from "~/components/FormField";
import { apiFetchRaw, forwardSetCookie } from "~/lib/api.server";
import { getCurrentUser } from "~/lib/auth.server";

import type { Route } from "./+types/login";

function safeRedirect(value: string): string {
  if (value.startsWith("/admin") && !value.startsWith("//")) return value;
  return "/admin";
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getCurrentUser(request);
  if (user) {
    throw redirect("/admin");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const redirectTo = safeRedirect(String(form.get("redirectTo") ?? ""));

  if (!email || !password) {
    return data({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await apiFetchRaw("/api/auth/login", {
      method: "POST",
      json: { email, password },
      request,
    });
  } catch {
    return data(
      { error: "Não foi possível conectar ao serviço. Tente novamente." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    let message = "E-mail ou senha inválidos.";
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      if (problem.detail || problem.title) {
        message = problem.detail ?? problem.title ?? message;
      }
    } catch {
      // keep default message
    }
    return data({ error: message }, { status: response.status });
  }

  // Forward the API's Set-Cookie (httpOnly `ficas_token`) to the browser.
  const headers = forwardSetCookie(response);
  return redirect(redirectTo, { headers });
}

export const meta: Route.MetaFunction = () => [
  { title: "Entrar — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/admin";
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="surface-mesh hero min-h-screen">
      <div className="hero-content w-full max-w-md">
        <div className="w-full">
          <div className="mb-6 flex justify-center">
            <BrandMark
              siteName="FICAS"
              tagline="Painel administrativo"
              size="lg"
              asLink={false}
            />
          </div>

          <div className="card border border-base-300 bg-base-100 shadow-lg">
            <div className="card-body gap-5">
              <div>
                <h1 className="font-display text-2xl font-semibold">
                  Acesse o painel
                </h1>
                <p className="mt-1 text-sm text-base-content/60">
                  Entre com suas credenciais para gerenciar o conteúdo do site.
                </p>
              </div>

              {actionData?.error ? (
                <Alert status="error">{actionData.error}</Alert>
              ) : null}

              <Form method="post" className="flex flex-col gap-4">
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <FormField
                  label="E-mail"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="voce@ficas.org.br"
                />
                <FormField
                  label="Senha"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="submit"
                  className="btn btn-primary mt-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : null}
                  Entrar
                </button>
              </Form>
            </div>
          </div>

          <Link
            to="/"
            className="mt-5 flex items-center justify-center gap-1 text-sm text-base-content/60 transition-colors hover:text-primary"
          >
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
