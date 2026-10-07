import { Outlet, useRouteLoaderData } from "react-router";

import { AdminLayout } from "~/components/AdminLayout";
import { requireUser } from "~/lib/auth.server";

import type { Route } from "./+types/admin-layout";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export default function AdminLayoutRoute({ loaderData }: Route.ComponentProps) {
  return (
    <AdminLayout user={loaderData.user}>
      <Outlet />
    </AdminLayout>
  );
}

/** Shared accessor for the authenticated user inside admin routes. */
export function useAdminUser() {
  return useRouteLoaderData<typeof loader>("routes/admin/admin-layout");
}
