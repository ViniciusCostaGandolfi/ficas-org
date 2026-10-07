import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // Public site — shares the navbar/drawer/footer shell.
  layout("routes/public-layout.tsx", [
    index("routes/home.tsx"),
    route("noticias", "routes/news-list.tsx"),
    route("noticias/:slug", "routes/news-detail.tsx"),
    route("categoria/:slug", "routes/category.tsx"),
    route("colabore", "routes/colabore.tsx"),
    route("contato", "routes/contato.tsx"),
    // Institutional catch-all — must stay AFTER the fixed public routes.
    route(":slug", "routes/institutional-page.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),

  // Admin — login is public, the rest is guarded by the layout loader.
  route("admin/login", "routes/admin/login.tsx"),
  route("admin/logout", "routes/admin/logout.ts"),
  layout("routes/admin/admin-layout.tsx", [
    route("admin", "routes/admin/dashboard.tsx"),
    route("admin/posts", "routes/admin/posts.tsx"),
    route("admin/posts/new", "routes/admin/post-new.tsx"),
    route("admin/posts/:id/edit", "routes/admin/post-edit.tsx"),
    route("admin/pages", "routes/admin/pages.tsx"),
    route("admin/pages/new", "routes/admin/page-new.tsx"),
    route("admin/pages/:id/edit", "routes/admin/page-edit.tsx"),
    route("admin/campaigns", "routes/admin/campaigns.tsx"),
    route("admin/campaigns/new", "routes/admin/campaigns-new.tsx"),
    route("admin/campaigns/:id/edit", "routes/admin/campaigns-edit.tsx"),
    route("admin/categories", "routes/admin/categories.tsx"),
    route("admin/media", "routes/admin/media.tsx"),
    route("admin/leads", "routes/admin/leads.tsx"),
    route("admin/users", "routes/admin/users.tsx"),
    route("admin/settings", "routes/admin/settings.tsx"),
  ]),
] satisfies RouteConfig;
