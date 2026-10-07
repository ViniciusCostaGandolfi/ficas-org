import { data, redirect } from "react-router";

import { NotFoundContent } from "~/components/NotFoundContent";
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
import {
  ApiError,
  type AdminCampaignDto,
  type CampaignFormSchema,
} from "~/lib/types";

import type { Route } from "./+types/campaigns-edit";

/**
 * The contract types `formSchema` as an object; older rows may still deliver it
 * as a JSON string, so normalize before handing it to the builder.
 */
function normalizeCampaign(raw: AdminCampaignDto): AdminCampaignDto {
  const schema = (raw as { formSchema?: unknown }).formSchema;
  let formSchema: CampaignFormSchema = { fields: [] };

  if (typeof schema === "string") {
    try {
      const parsed = JSON.parse(schema) as CampaignFormSchema;
      if (parsed && Array.isArray(parsed.fields)) formSchema = parsed;
    } catch {
      formSchema = { fields: [] };
    }
  } else if (schema && typeof schema === "object" && Array.isArray((schema as CampaignFormSchema).fields)) {
    formSchema = schema as CampaignFormSchema;
  }

  return { ...raw, formSchema };
}

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireUser(request);
  const api = createApi(request);

  try {
    const campaign = await api.get<AdminCampaignDto>(
      `/api/admin/campaigns/${params.id}`,
    );
    return { campaign: normalizeCampaign(campaign) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw data("Campanha não encontrada", { status: 404 });
    }
    throw error;
  }
}

export async function action({ params, request }: Route.ActionArgs) {
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

    await api.put(`/api/admin/campaigns/${params.id}`, payload);
    return redirect("/admin/campaigns");
  } catch (error) {
    const { status, body } = toActionError(error);
    return data(body, { status });
  }
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => [
  {
    title: `Editar: ${loaderData?.campaign?.title ?? "campanha"} — Painel FICAS`,
  },
  { name: "robots", content: "noindex" },
];

export function ErrorBoundary() {
  return <NotFoundContent title="Campanha não encontrada" />;
}

export default function CampaignEdit({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Editar campanha"
        breadcrumb="Campanhas"
        description={loaderData.campaign.title}
      />

      <CampaignForm
        mode="edit"
        campaign={loaderData.campaign}
        fieldErrors={actionData?.fieldErrors}
        message={actionData?.message}
        ok={actionData?.ok}
      />
    </div>
  );
}
