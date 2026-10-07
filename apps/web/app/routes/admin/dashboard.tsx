import { Link } from "react-router";

import {
  ArrowUpRightIcon,
  CogIcon,
  FileTextIcon,
  FolderIcon,
  LayersIcon,
  NewspaperIcon,
  PlusIcon,
  UsersIcon,
} from "~/components/Icons";
import { AdminPageHeader } from "~/components/admin/AdminPageHeader";
import { createApi, withFallback } from "~/lib/api.server";
import { requireUser } from "~/lib/auth.server";
import { emptyPage, type Page } from "~/lib/types";

import type { Route } from "./+types/dashboard";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const api = createApi(request);

  const [posts, pages, media, leads] = await Promise.all([
    withFallback(
      () => api.get<Page<unknown>>("/api/admin/posts?page=0&size=1"),
      emptyPage(1),
      "dash-posts",
    ),
    withFallback(
      () => api.get<Page<unknown>>("/api/admin/pages?page=0&size=1"),
      emptyPage(1),
      "dash-pages",
    ),
    withFallback(
      () => api.get<Page<unknown>>("/api/admin/media?page=0&size=1"),
      emptyPage(1),
      "dash-media",
    ),
    withFallback(
      () => api.get<Page<unknown>>("/api/admin/leads?page=0&size=1"),
      emptyPage(1),
      "dash-leads",
    ),
  ]);

  return {
    counts: {
      posts: posts.totalElements,
      pages: pages.totalElements,
      media: media.totalElements,
      leads: leads.totalElements,
    },
  };
}

export const meta: Route.MetaFunction = () => [
  { title: "Dashboard — Painel FICAS" },
  { name: "robots", content: "noindex" },
];

const QUICK_ACTIONS = [
  { to: "/admin/posts/new", label: "Novo post", icon: PlusIcon },
  { to: "/admin/pages/new", label: "Nova página", icon: PlusIcon },
  { to: "/admin/media", label: "Enviar mídia", icon: NewspaperIcon },
  { to: "/admin/settings", label: "Configurações", icon: CogIcon },
];

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const stats = [
    {
      label: "Posts",
      value: loaderData.counts.posts,
      to: "/admin/posts",
      icon: FileTextIcon,
    },
    {
      label: "Páginas",
      value: loaderData.counts.pages,
      to: "/admin/pages",
      icon: LayersIcon,
    },
    {
      label: "Mídias",
      value: loaderData.counts.media,
      to: "/admin/media",
      icon: NewspaperIcon,
    },
    {
      label: "Leads",
      value: loaderData.counts.leads,
      to: "/admin/leads",
      icon: UsersIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Dashboard"
        description="Visão geral do conteúdo e das interações do site."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.to}
              className="card group border border-base-300 bg-base-100 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="card-body gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-box bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRightIcon className="h-4 w-4 text-base-content/30 transition group-hover:text-primary" />
                </div>
                <p className="font-display text-3xl font-semibold leading-none">
                  {stat.value}
                </p>
                <p className="text-sm text-base-content/60">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">
          Ações rápidas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="card border border-base-300 bg-base-100 transition hover:border-primary hover:shadow-sm"
              >
                <div className="card-body flex-row items-center gap-3 py-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-box bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-medium">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-box border border-base-300 bg-base-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-box bg-secondary/10 text-secondary">
              <FolderIcon className="h-5 w-5" />
            </span>
            <h2 className="font-display text-lg font-semibold">
              Organize seu conteúdo
            </h2>
          </div>
          <Link to="/admin/categories" className="btn btn-ghost btn-sm">
            Gerenciar categorias
          </Link>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-base-content/60">
          Categorias e tags ajudam a organizar posts e facilitam a navegação do
          público.
        </p>
      </section>
    </div>
  );
}
