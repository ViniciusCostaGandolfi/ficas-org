import { data, redirect } from "react-router";

import { CampaignForm } from "~/components/admin/CampaignForm";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import {
  buildCampaignPayload,
  toActionError,
  uploadFromForm,
  validateCampaign,
} from "~/lib/admin.server";
import { createApi } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import type { AdminCampaignDto } from "~/lib/types";

import type { Route } from "./+types/campaigns-new";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const api = createApi(request);
  const intent = String(form.get("intent") ?? "save");

  try {
    if (intent === "upload") {
      const media = await uploadFromForm(api, form);
      return {
        ok: true,
        media,
        message: "Mídia enviada com sucesso.",
        fieldErrors: {} as Record<string, string>,
      };
    }

    const payload = buildCampaignPayload(form);
    const fieldErrors = validateCampaign(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return data(
        { ok: false, fieldErrors, message: "Revise os campos destacados." },
        { status: 400 },
      );
    }

    const created = await api.post<AdminCampaignDto>(
      "/api/admin/campaigns",
      payload,
    );
    if (created?.id) {
      return redirect(`/admin/campaigns/${created.id}/edit`);
    }
    return redirect("/admin/campaigns");
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Nova campanha — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

export default function CampaignNew({ actionData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Nova campanha"
        description="Defina os dados e monte o formulário de inscrição."
      />

      <CampaignForm
        mode="create"
        fieldErrors={actionData?.fieldErrors}
        message={actionData?.message}
        ok={actionData?.ok}
      />
    </div>
  );
}
