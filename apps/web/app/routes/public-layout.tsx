import { Outlet, useRouteLoaderData } from "react-router";

import { PublicLayout } from "~/components/PublicLayout";
import { createApi, withFallback } from "~/lib/api.server";
import type { MenuItemDto, SiteSettingsDto } from "~/lib/types";

import type { Route } from "./+types/public-layout";

export async function loader({ request }: Route.LoaderArgs) {
  const api = createApi(request);

  // Settings and menu drive the whole public shell; keep rendering even if the
  // API is unavailable by falling back to safe defaults.
  const [settings, menu] = await Promise.all([
    withFallback(
      () => api.get<SiteSettingsDto>("/api/public/settings"),
      null,
      "public-settings",
    ),
    withFallback(
      () => api.get<MenuItemDto[]>("/api/public/menu"),
      [] as MenuItemDto[],
      "public-menu",
    ),
  ]);

  return { settings, menu };
}

export default function PublicLayoutRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PublicLayout settings={loaderData.settings} menu={loaderData.menu}>
      <Outlet />
    </PublicLayout>
  );
}

/** Shared accessor so child routes can read shell data (settings/menu). */
export function usePublicLayoutData() {
  return useRouteLoaderData<typeof loader>("routes/public-layout");
}
