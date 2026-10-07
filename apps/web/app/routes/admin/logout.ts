import { redirect } from "react-router";

import { apiFetchRaw, forwardSetCookie } from "~/lib/api.server";

import type { Route } from "./+types/logout";

async function logout(request: Request) {
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

// Logout submitted by the admin layout's <Form method="post">.
export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

// Direct GET (e.g. typing /admin/logout in the address bar) must not 500:
// a resource route with no loader throws "Unexpected Server Error" on GET.
export async function loader({ request }: Route.LoaderArgs) {
  return logout(request);
}
