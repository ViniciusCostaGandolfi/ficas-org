import { data, Form } from "react-router";

import { Alert } from "~/components/Alert";
import { FormField } from "~/components/FormField";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import { MediaUrlField } from "~/components/admin/MediaUrlField";
import { toActionError, uploadFromForm } from "~/lib/admin.server";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { getOptionalString, getString } from "~/lib/format";
import type { AdminSiteSettingsDto } from "~/lib/types";

import type { Route } from "./+types/settings";

function buildSettings(
  form: FormData,
  current: AdminSiteSettingsDto | null,
): AdminSiteSettingsDto {
  const amounts = getString(form, "pixSuggestedAmounts")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return {
    siteName: getString(form, "siteName"),
    siteDescription: getString(form, "siteDescription"),
    logoUrl: getOptionalString(form, "logoUrl"),
    // Not editable in the admin anymore: keep whatever the API already has so
    // saving the form never wipes the stored favicon.
    faviconUrl: current?.faviconUrl ?? null,
    social: {
      instagram: getString(form, "socialInstagram"),
      facebook: getString(form, "socialFacebook"),
      youtube: getString(form, "socialYoutube"),
      twitter: getString(form, "socialTwitter"),
      linkedin: getString(form, "socialLinkedin"),
    },
    contact: {
      email: getString(form, "contactEmail"),
      phone: getString(form, "contactPhone"),
      address: getString(form, "contactAddress"),
    },
    pix: {
      key: getString(form, "pixKey"),
      qrImageUrl: getOptionalString(form, "pixQrImageUrl"),
      suggestedAmounts: amounts,
    },
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const api = createApi(request);
  const settings = await withFallback(
    () => api.get<AdminSiteSettingsDto>("/api/admin/settings"),
    null,
    "admin-settings",
  );
  return { settings };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");
  const api = createApi(request);

  try {
    // The media picker modal uploads through the current route.
    if (intent === "upload") {
      const media = await uploadFromForm(api, form);
      return {
        ok: true,
        media,
        message: "Mídia enviada com sucesso.",
        fieldErrors: {} as Record<string, string>,
      };
    }

    // Read the current settings so non-editable values (e.g. favicon) survive
    // the PUT, which expects the full shared settings shape.
    const current = await withFallback(
      () => api.get<AdminSiteSettingsDto>("/api/admin/settings"),
      null,
      "admin-settings-current",
    );
    await api.put("/api/admin/settings", buildSettings(form, current));
    return {
      ok: true,
      message: "Configurações salvas com sucesso.",
      fieldErrors: {} as Record<string, string>,
    };
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Configurações — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const settings = loaderData.settings;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Configurações"
        description="Identidade do site, redes sociais, contato e doação via Pix."
      />

      {actionData?.message ? (
        <Alert status={actionData.ok ? "success" : "error"}>
          {actionData.message}
        </Alert>
      ) : null}

      <Form method="post" className="flex flex-col gap-6">
        <fieldset className="fieldset rounded-box border border-base-300 bg-base-100 p-4">
          <legend className="fieldset-legend">Identidade</legend>
          <FormField
            label="Nome do site"
            name="siteName"
            required
            defaultValue={settings?.siteName ?? ""}
            error={actionData?.fieldErrors?.siteName}
          />
          <FormField
            label="Descrição"
            name="siteDescription"
            as="textarea"
            rows={2}
            defaultValue={settings?.siteDescription ?? ""}
          />
          <MediaUrlField
            label="Logo"
            name="logoUrl"
            defaultValue={settings?.logoUrl ?? ""}
            help="Imagem exibida no cabeçalho e no rodapé do site."
          />
        </fieldset>

        <fieldset className="fieldset rounded-box border border-base-300 bg-base-100 p-4">
          <legend className="fieldset-legend">Redes sociais</legend>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField
              label="Instagram"
              name="socialInstagram"
              type="url"
              defaultValue={settings?.social.instagram ?? ""}
              placeholder="https://instagram.com/…"
            />
            <FormField
              label="Facebook"
              name="socialFacebook"
              type="url"
              defaultValue={settings?.social.facebook ?? ""}
            />
            <FormField
              label="YouTube"
              name="socialYoutube"
              type="url"
              defaultValue={settings?.social.youtube ?? ""}
            />
            <FormField
              label="Twitter/X"
              name="socialTwitter"
              type="url"
              defaultValue={settings?.social.twitter ?? ""}
              placeholder="https://twitter.com/…"
            />
            <FormField
              label="LinkedIn"
              name="socialLinkedin"
              type="url"
              defaultValue={settings?.social.linkedin ?? ""}
            />
          </div>
        </fieldset>

        <fieldset className="fieldset rounded-box border border-base-300 bg-base-100 p-4">
          <legend className="fieldset-legend">Contato</legend>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField
              label="E-mail"
              name="contactEmail"
              type="email"
              defaultValue={settings?.contact.email ?? ""}
            />
            <FormField
              label="Telefone"
              name="contactPhone"
              defaultValue={settings?.contact.phone ?? ""}
            />
          </div>
          <FormField
            label="Endereço"
            name="contactAddress"
            as="textarea"
            rows={2}
            defaultValue={settings?.contact.address ?? ""}
          />
        </fieldset>

        <fieldset className="fieldset rounded-box border border-base-300 bg-base-100 p-4">
          <legend className="fieldset-legend">Pix</legend>
          <FormField
            label="Chave Pix"
            name="pixKey"
            defaultValue={settings?.pix.key ?? ""}
          />
          <FormField
            label="URL do QR Code"
            name="pixQrImageUrl"
            defaultValue={settings?.pix.qrImageUrl ?? ""}
          />
          <FormField
            label="Valores sugeridos"
            name="pixSuggestedAmounts"
            defaultValue={(settings?.pix.suggestedAmounts ?? []).join(", ")}
            help="Separe por vírgula. Ex.: 25, 50, 100"
          />
        </fieldset>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">
            Salvar configurações
          </button>
        </div>
      </Form>
    </div>
  );
}
