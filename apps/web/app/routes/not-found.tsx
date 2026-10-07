import { NotFoundContent } from "~/components/NotFoundContent";
import {
  findLegacyRedirect,
  legacyRedirectResponse,
} from "~/lib/redirects.server";

import type { Route } from "./+types/not-found";

/**
 * Catch-all loader. Before showing the 404 we ask the API whether this path
 * was an old WordPress URL with a known new home; if so we redirect.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const match = await findLegacyRedirect(request);
  if (match) {
    throw legacyRedirectResponse(match);
  }
  return null;
}

export const meta: Route.MetaFunction = () => [
  { title: "Página não encontrada — FICAS" },
  { name: "robots", content: "noindex" },
];

export default function NotFoundRoute() {
  return <NotFoundContent />;
}
