import { useEffect } from "react";
import type { ReactNode } from "react";
import { Form, Link, NavLink, useLocation, useNavigation } from "react-router";

import type { UserDto } from "~/lib/types";

import { BrandMark } from "./BrandMark";
import {
  CogIcon,
  DashboardIcon,
  FileTextIcon,
  FolderIcon,
  LayersIcon,
  LogoutIcon,
  MegaphoneIcon,
  MenuIcon,
  NewspaperIcon,
  UsersIcon,
} from "./Icons";

export interface AdminLayoutProps {
  user: UserDto;
  children: ReactNode;
}

const DRAWER_ID = "admin-drawer";

const NAV_GROUPS = [
  {
    label: "Visão geral",
    items: [
      { to: "/admin", label: "Dashboard", icon: DashboardIcon, end: true },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { to: "/admin/posts", label: "Posts", icon: FileTextIcon, end: false },
      { to: "/admin/pages", label: "Páginas", icon: LayersIcon, end: false },
      {
        to: "/admin/campaigns",
        label: "Campanhas",
        icon: MegaphoneIcon,
        end: false,
      },
      {
        to: "/admin/categories",
        label: "Categorias",
        icon: FolderIcon,
        end: false,
      },
      { to: "/admin/media", label: "Mídia", icon: NewspaperIcon, end: false },
    ],
  },
  {
    label: "Interações",
    items: [
      { to: "/admin/leads", label: "Leads", icon: UsersIcon, end: false },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/users", label: "Usuários", icon: UsersIcon, end: false },
      { to: "/admin/settings", label: "Configurações", icon: CogIcon, end: false },
    ],
  },
];

export function AdminLayout({ user, children }: AdminLayoutProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    const toggle = document.getElementById(DRAWER_ID) as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  }, [location.pathname]);

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="drawer lg:drawer-open">
      <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-h-screen flex-col bg-base-200">
        <header className="sticky top-0 z-40 bg-base-100/95 backdrop-blur supports-[backdrop-filter]:bg-base-100/80">
          <div className="navbar min-h-16 gap-2 border-b border-base-300 px-3 sm:px-4">
            <div className="navbar-start gap-2">
              <label
                htmlFor={DRAWER_ID}
                className="btn btn-ghost btn-square lg:hidden"
                aria-label="Abrir menu"
              >
                <MenuIcon />
              </label>
              <Link
                to="/admin"
                className="font-display text-lg font-semibold text-primary"
              >
                Painel FICAS
              </Link>
              {isNavigating ? (
                <span className="loading loading-spinner loading-sm text-primary" />
              ) : null}
            </div>

            <div className="navbar-end gap-1 sm:gap-2">
              <Link
                to="/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm hidden sm:inline-flex"
              >
                Ver site
              </Link>
              <div className="dropdown dropdown-end">
                <button
                  type="button"
                  tabIndex={0}
                  className="btn btn-ghost h-auto gap-2 px-2"
                  aria-label="Menu do usuário"
                >
                  <span className="hidden text-right sm:block">
                    <span className="block text-sm font-medium leading-tight">
                      {user.name}
                    </span>
                    <span className="block text-xs text-base-content/60">
                      {user.role}
                    </span>
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content">
                    {initials || "U"}
                  </span>
                </button>
                <ul
                  tabIndex={0}
                  className="menu dropdown-content z-50 mt-2 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
                >
                  <li>
                    <Link to="/" target="_blank" rel="noreferrer">
                      Ver site
                    </Link>
                  </li>
                  <li>
                    <Form method="post" action="/admin/logout">
                      <button type="submit" className="text-error">
                        <LogoutIcon className="h-4 w-4" /> Sair
                      </button>
                    </Form>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="brand-rule" />
        </header>

        <main id="main-content" className="grow p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <div className="drawer-side z-50">
        <label
          htmlFor={DRAWER_ID}
          className="drawer-overlay"
          aria-label="Fechar menu"
        />
        <nav className="flex min-h-full w-72 flex-col border-r border-base-300 bg-base-100">
          <div className="border-b border-base-300 p-4">
            <BrandMark
              siteName="FICAS"
              tagline="Painel administrativo"
              asLink={false}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  {group.label}
                </p>
                <ul className="menu w-full gap-0.5 p-0">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            isActive ? "menu-active font-semibold" : ""
                          }
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-base-300 p-3">
            <div className="mb-2 flex items-center gap-2 px-2 py-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-content">
                {initials || "U"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {user.name}
                </span>
                <span className="block text-xs text-base-content/55">
                  {user.role}
                </span>
              </span>
            </div>
            <Form method="post" action="/admin/logout">
              <button type="submit" className="btn btn-ghost btn-sm w-full justify-start text-error">
                <LogoutIcon className="h-4 w-4" /> Sair
              </button>
            </Form>
          </div>
        </nav>
      </div>
    </div>
  );
}
