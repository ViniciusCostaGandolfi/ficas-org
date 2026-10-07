import { redirect } from "react-router";

import { apiFetchRaw, forwardSetCookie } from "~/lib/api.server";

import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  let headers = new Headers();

  try {
    const response = await apiFetchRaw("/api/auth/logout", {
      method: "POST",
      request,
    });
    headers = forwardSetCookie(response, headers);
  } catch {
    // Even if the API is unreachable, send the user back to the login screen.
  }

  return redirect("/admin/login", { headers });
}
