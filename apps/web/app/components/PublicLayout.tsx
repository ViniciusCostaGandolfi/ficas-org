import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";

import { CONTACT_ADDRESS, resolveSocial, telHref, whatsappHref } from "~/lib/site";
import type { MenuItemDto, SiteSettingsDto, SocialLinks } from "~/lib/types";

import { BrandMark } from "./BrandMark";
import {
  ChevronDownIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  LoginIcon,
  MenuIcon,
  TwitterIcon,
  YoutubeIcon,
} from "./Icons";
import { ShareSidebar } from "./ShareSidebar";

export interface PublicLayoutProps {
  settings: SiteSettingsDto | null;
  menu: MenuItemDto[];
  children: ReactNode;
}

const DRAWER_ID = "public-drawer";

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function externalProps(item: MenuItemDto) {
  return {
    href: item.url,
    target: item.target || "_blank",
    rel: "noreferrer",
  } as const;
}

/* ------------------------------------------------------------------ */
/* Desktop navigation                                                  */
/* ------------------------------------------------------------------ */

const linkBase =
  "relative flex items-center gap-1 whitespace-nowrap rounded-field px-2.5 py-2 text-sm font-medium transition-colors";

function navLinkClass(isActive: boolean): string {
  return `${linkBase} ${
    isActive
      ? "text-primary"
      : "text-base-content/75 hover:bg-primary/5 hover:text-primary"
  }`;
}

function ActiveBar() {
  return (
    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
  );
}

function isChildActive(pathname: string, url: string): boolean {
  if (!url || isExternal(url)) return false;
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

function DesktopNav({ items }: { items: MenuItemDto[] }) {
  const { pathname } = useLocation();

  return (
    <>
      {items.map((item, position) => {
        const key = item.id ?? `${item.label}-${item.url}`;
        const hasChildren = item.children && item.children.length > 0;
        // Keep the right-most dropdowns anchored so they never spill off-screen.
        const alignEnd = position >= items.length - 2;

        if (hasChildren) {
          const active = item.children.some((child) =>
            isChildActive(pathname, child.url),
          );

          return (
            <div
              key={key}
              className={`dropdown dropdown-hover group/dropdown ${
                alignEnd ? "dropdown-end" : ""
              }`}
            >
              <button
                type="button"
                tabIndex={0}
                aria-haspopup="true"
                className={`${linkBase} ${
                  active
                    ? "text-primary"
                    : "text-base-content/75 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {item.label}
                <ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-hover/dropdown:rotate-180 group-focus-within/dropdown:rotate-180" />
              </button>
              {/* The panel starts right below the trigger thanks to padding
                  (`pt-1`) instead of a top margin: the transparent frame is
                  part of the hover area, so the menu stays open while the
                  pointer travels from the trigger to an item and the link
                  remains clickable. */}
              <div className="dropdown-content z-50 w-56 pt-1">
                <ul
                  tabIndex={0}
                  className="menu w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
                >
                  {item.children.map((child) => (
                    <li key={child.id ?? child.url}>
                      {isExternal(child.url) ? (
                        <a {...externalProps(child)}>{child.label}</a>
                      ) : (
                        <NavLink to={child.url || "/"}>{child.label}</NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        }

        if (isExternal(item.url)) {
          return (
            <a
              key={key}
              {...externalProps(item)}
              className={`${linkBase} text-base-content/75 hover:bg-primary/5 hover:text-primary`}
            >
              {item.label}
            </a>
          );
        }

        return (
          <NavLink key={key} to={item.url || "/"} className={({ isActive }) => navLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                {item.label}
                {isActive ? <ActiveBar /> : null}
              </>
            )}
          </NavLink>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile (drawer) navigation                                          */
/* ------------------------------------------------------------------ */

function MobileNav({ items, onNavigate }: { items: MenuItemDto[]; onNavigate: () => void }) {
  return (
    <>
      {items.map((item) => {
        const key = item.id ?? `${item.label}-${item.url}`;
        const hasChildren = item.children && item.children.length > 0;

        if (hasChildren) {
          return (
            <li key={key}>
              <details>
                <summary>{item.label}</summary>
                <ul>
                  <MobileNav items={item.children} onNavigate={onNavigate} />
                </ul>
              </details>
            </li>
          );
        }

        if (isExternal(item.url)) {
          return (
            <li key={key}>
              <a {...externalProps(item)}>{item.label}</a>
            </li>
          );
        }

        return (
          <li key={key}>
            <NavLink
              to={item.url || "/"}
              end={item.url === "/"}
              onClick={onNavigate}
              className={({ isActive }) => (isActive ? "menu-active" : "")}
            >
              {item.label}
            </NavLink>
          </li>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Social + footer                                                     */
/* ------------------------------------------------------------------ */

function SocialLinks({
  links,
  className = "",
}: {
  links: SocialLinks;
  className?: string;
}) {
  const entries: Array<[keyof SocialLinks, ReactNode, string]> = [
    ["instagram", <InstagramIcon className="h-5 w-5" />, "Instagram"],
    ["facebook", <FacebookIcon className="h-5 w-5" />, "Facebook"],
    ["twitter", <TwitterIcon className="h-5 w-5" />, "Twitter/X"],
    ["linkedin", <LinkedinIcon className="h-5 w-5" />, "LinkedIn"],
    ["youtube", <YoutubeIcon className="h-5 w-5" />, "YouTube"],
  ];
  const available = entries.filter(([key]) => links[key]);

  if (available.length === 0) return null;

  return (
    <div className={`flex gap-1 ${className}`}>
      {available.map(([key, icon, label]) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className="btn btn-ghost btn-square btn-sm text-base-content/70 hover:text-primary"
        >
          {icon}
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer columns                                                      */
/* ------------------------------------------------------------------ */

interface FooterLink {
  label: string;
  url: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/** Accent/case-insensitive comparison for menu group labels. */
function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Footer groups mirror the old ficas.org.br structure (FICAS / ATUAÇÃO /
 * NOTÍCIAS / Endereço). Links are still driven by the API menu tree, so editing
 * the menu keeps the footer in sync; the fallbacks keep other pages working
 * when the API is unreachable.
 */
const FOOTER_GROUPS: Array<{
  title: string;
  aliases: string[];
  fallback: FooterLink[];
}> = [
  {
    title: "FICAS",
    aliases: ["institucional", "ficas"],
    fallback: [
      { label: "História", url: "/historia" },
      { label: "Filosofia", url: "/filosofia" },
      { label: "Metodologia", url: "/metodologia" },
      { label: "Conselhos", url: "/conselhos" },
      { label: "Equipe", url: "/equipe" },
      { label: "Balanço", url: "/balanco" },
    ],
  },
  {
    title: "Atuação",
    aliases: ["atuacao"],
    fallback: [
      { label: "Programas", url: "/programas" },
      { label: "Assessorias", url: "/assessorias" },
      { label: "Ações", url: "/acoes" },
      { label: "Parceiros", url: "/parceiros" },
    ],
  },
  {
    title: "Notícias",
    aliases: ["noticias"],
    fallback: [
      { label: "FICAS em Ação", url: "/categoria/ficas-em-acao" },
      { label: "Dicas FICAS", url: "/categoria/dicas-ficas" },
      { label: "Últimas notícias", url: "/noticias" },
    ],
  },
];

function buildFooterColumns(menu: MenuItemDto[]): FooterColumn[] {
  const byLabel = new Map<string, MenuItemDto>();
  for (const item of menu) {
    byLabel.set(normalizeLabel(item.label), item);
  }

  return FOOTER_GROUPS.map((group) => {
    const match = group.aliases
      .map((alias) => byLabel.get(alias))
      .find((item): item is MenuItemDto => Boolean(item));

    const children = match?.children ?? [];
    // Skip a child that just repeats the column heading (e.g. "Atuação" under
    // the "ATUAÇÃO" column) before falling back to the curated defaults.
    const selfLabels = new Set(
      [group.title, ...group.aliases].map(normalizeLabel),
    );
    const childLinks = children
      .filter((child) => !selfLabels.has(normalizeLabel(child.label)))
      .map((child) => ({ label: child.label, url: child.url || "#" }));

    return { title: group.title, links: childLinks.length > 0 ? childLinks : group.fallback };
  });
}

function SiteFooter({
  settings,
  menu,
}: {
  settings: SiteSettingsDto | null;
  menu: MenuItemDto[];
}) {
  const siteName = settings?.siteName || "FICAS";
  const year = new Date().getFullYear();
  const columns = buildFooterColumns(menu);
  const social = resolveSocial(settings);

  return (
    <footer className="mt-auto border-t border-base-300 bg-base-200">
      <div className="brand-rule" />
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.2fr_2.8fr]">
        <aside className="max-w-xs">
          <BrandMark
            logoUrl={settings?.logoUrl}
            siteName={siteName}
          />
          <p className="mt-4 text-sm leading-relaxed text-base-content/70">
            {settings?.siteDescription ||
              "Compartilhando conhecimentos, transformando pessoas e organizações."}
          </p>
        </aside>

        <nav
          aria-label="Links do rodapé"
          className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4"
        >
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-base-content/50">
                {column.title}
              </h2>
              {column.links.map((link) =>
                isExternal(link.url) ? (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="link link-hover w-fit text-xs font-medium uppercase tracking-wide text-base-content/75 hover:text-primary"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.url}
                    className="link link-hover w-fit text-xs font-medium uppercase tracking-wide text-base-content/75 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          ))}

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-base-content/50">
              Endereço
            </h2>
            <address className="flex flex-col gap-1 text-xs not-italic leading-relaxed text-base-content/75">
              <span>{CONTACT_ADDRESS.street}</span>
              <span>{CONTACT_ADDRESS.district}</span>
              <span>{CONTACT_ADDRESS.city}</span>
              <span>{CONTACT_ADDRESS.postalCode}</span>
              <a
                href={telHref(CONTACT_ADDRESS.phone)}
                className="link link-hover w-fit hover:text-primary"
              >
                Tel: {CONTACT_ADDRESS.phone}
              </a>
              <a
                href={whatsappHref(CONTACT_ADDRESS.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="link link-hover w-fit hover:text-primary"
              >
                WhatsApp: {CONTACT_ADDRESS.whatsapp}
              </a>
            </address>
          </div>
        </nav>
      </div>

      <div className="border-t border-base-300/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 pb-16 pt-5 text-xs text-base-content/60 sm:flex-row md:pb-5">
          <p>
            © {year} {siteName}. Todos os direitos reservados.
          </p>
          <SocialLinks links={social} />
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Layout shell                                                        */
/* ------------------------------------------------------------------ */

export function PublicLayout({ settings, menu, children }: PublicLayoutProps) {
  const location = useLocation();
  const siteName = settings?.siteName || "FICAS";

  // Keep the mobile drawer in sync with navigation.
  useEffect(() => {
    const toggle = document.getElementById(DRAWER_ID) as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  }, [location.pathname]);

  const closeDrawer = () => {
    const toggle = document.getElementById(DRAWER_ID) as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  };

  return (
    <div className="drawer">
      <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 bg-base-100/90 backdrop-blur supports-[backdrop-filter]:bg-base-100/75">
          <div className="brand-rule" />
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
            <label
              htmlFor={DRAWER_ID}
              className="btn btn-ghost btn-square lg:hidden"
              aria-label="Abrir menu"
            >
              <MenuIcon />
            </label>

            <BrandMark
              logoUrl={settings?.logoUrl}
              siteName={siteName}
            />

            <nav
              aria-label="Navegação principal"
              className="ml-auto hidden items-center gap-0.5 lg:flex"
            >
              <NavLink
                to="/"
                end
                className={({ isActive }) => navLinkClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    Início
                    {isActive ? <ActiveBar /> : null}
                  </>
                )}
              </NavLink>
              <DesktopNav items={menu} />
            </nav>

            <div className="ml-auto flex items-center gap-2 lg:ml-3">
              <Link to="/colabore" className="btn btn-accent btn-sm">
                Colabore
              </Link>
              <Link
                to="/admin/login"
                aria-label="Painel administrativo"
                title="Painel administrativo"
                className="btn btn-ghost btn-square btn-sm text-base-content/50 hover:text-primary"
              >
                <LoginIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="h-px bg-base-300" />
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl grow px-4 py-10 lg:py-16"
        >
          {children}
        </main>

        <SiteFooter settings={settings} menu={menu} />
      </div>

      <div className="drawer-side z-50">
        <label
          htmlFor={DRAWER_ID}
          className="drawer-overlay"
          aria-label="Fechar menu"
        />
        <div className="flex min-h-full w-80 flex-col bg-base-100">
          <div className="flex items-center justify-between border-b border-base-300 p-4">
            <BrandMark
              logoUrl={settings?.logoUrl}
              siteName={siteName}
              asLink={false}
            />
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              aria-label="Fechar menu"
              onClick={closeDrawer}
            >
              ✕
            </button>
          </div>

          <ul className="menu w-full flex-1 gap-1 p-4 text-base-content">
            <li>
              <NavLink
                to="/"
                end
                onClick={closeDrawer}
                className={({ isActive }) => (isActive ? "menu-active" : "")}
              >
                Início
              </NavLink>
            </li>
            <MobileNav items={menu} onNavigate={closeDrawer} />
            <li>
              <Link
                to="/admin/login"
                onClick={closeDrawer}
                className="text-base-content/60"
              >
                <LoginIcon className="h-4 w-4" />
                Painel
              </Link>
            </li>
          </ul>

          <div className="border-t border-base-300 p-4">
            <div className="flex flex-col gap-2">
              <Link
                to="/colabore"
                className="btn btn-accent w-full"
                onClick={closeDrawer}
              >
                Colabore
              </Link>
            </div>
            <div className="mt-4">
              <SocialLinks links={resolveSocial(settings)} />
            </div>
          </div>
        </div>
      </div>

      {/* Public-only share bar (right on desktop, bottom on mobile). The admin
          uses `AdminLayout`, so it is excluded automatically. */}
      <ShareSidebar settings={settings} />
    </div>
  );
}
