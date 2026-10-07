import { useEffect, useState } from "react";

import { CONTACT_ADDRESS, resolveSocial, whatsappHref } from "~/lib/site";
import type { SiteSettingsDto } from "~/lib/types";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  TwitterIcon,
  WhatsAppIcon,
} from "./Icons";

/** Scroll distance (px) before the desktop bar slides in, mirroring the old widget. */
const REVEAL_AFTER = 300;

const SHARE_TEXT = "Confira esta página do FICAS";

interface ShareLink {
  key: string;
  label: string;
  href: string;
  /** Fixed brand color for the glyph (daisyUI rule 11). */
  iconColor: string;
  icon: typeof FacebookIcon;
}

function buildShareLinks(url: string, instagramUrl: string): ShareLink[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(SHARE_TEXT);

  return [
    {
      key: "facebook",
      label: "Compartilhar no Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      iconColor: "text-[#1877F2]",
      icon: FacebookIcon,
    },
    {
      key: "twitter",
      label: "Compartilhar no Twitter/X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      iconColor: "text-base-content",
      icon: TwitterIcon,
    },
    {
      key: "whatsapp",
      // Shares the current page through the FICAS number; the page URL travels
      // as the prefilled message.
      label: "Compartilhar no WhatsApp",
      href: whatsappHref(CONTACT_ADDRESS.whatsapp, url),
      iconColor: "text-[#128C7E]",
      icon: WhatsAppIcon,
    },
    {
      key: "linkedin",
      label: "Compartilhar no LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}`,
      iconColor: "text-[#0A66C2]",
      icon: LinkedinIcon,
    },
    {
      key: "email",
      label: "Compartilhar por e-mail",
      href: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
      iconColor: "text-[#EA4335]",
      icon: MailIcon,
    },
    {
      key: "instagram",
      // Instagram has no web share endpoint, so this entry links to the profile.
      label: "Siga a FICAS no Instagram",
      href: instagramUrl,
      iconColor: "text-[#E4405F]",
      icon: InstagramIcon,
    },
  ];
}

function ToggleButton({
  collapsed,
  onToggle,
  className = "",
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        collapsed
          ? "Mostrar botões de compartilhamento"
          : "Ocultar botões de compartilhamento"
      }
      aria-expanded={!collapsed}
      title={collapsed ? "Mostrar compartilhamento" : "Ocultar compartilhamento"}
      className={`btn btn-ghost btn-square btn-sm text-base-content/60 ${className}`}
    >
      {collapsed ? (
        <ChevronLeftIcon className="h-4 w-4" />
      ) : (
        <ChevronRightIcon className="h-4 w-4" />
      )}
    </button>
  );
}

export interface ShareSidebarProps {
  settings: SiteSettingsDto | null;
}

/**
 * Page share bar, shown on every public page (it lives in `PublicLayout`, so the
 * admin — which uses `AdminLayout` — never renders it).
 *
 * Desktop (>= md): the right-edge vertical bar that slides in after a bit of
 * scrolling. Mobile (< md): a full-width bar stuck to the bottom edge so it
 * never covers content on the right. Both share the collapse toggle, and the
 * URLs are derived from the live page URL after mount so SSR stays stable.
 */
export function ShareSidebar({ settings }: ShareSidebarProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Resolve the canonical page URL on the client only (no hydration mismatch).
  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > REVEAL_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const social = resolveSocial(settings);
  const links = url ? buildShareLinks(url, social.instagram) : [];

  const items = links.map((link) => {
    const Icon = link.icon;
    return (
      <li key={link.key}>
        <a
          href={link.href}
          target="_blank"
          rel="nofollow noopener"
          aria-label={link.label}
          title={link.label}
          className={`btn btn-ghost btn-square btn-sm rounded-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${link.iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </a>
      </li>
    );
  });

  return (
    <>
      {/* Desktop (>= md): right-edge vertical bar. */}
      <aside
        aria-label="Compartilhar esta página"
        className={`fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 transition-transform duration-300 ease-out motion-reduce:transition-none md:flex ${
          scrolled ? "translate-x-0" : "translate-x-[110%]"
        }`}
      >
        <div className="flex items-center rounded-l-box border border-r-0 border-base-300 bg-base-100 shadow-lg">
          <ToggleButton
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
            className="rounded-l-box"
          />
          <ul
            className={`flex flex-col overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none ${
              collapsed ? "w-0 opacity-0" : "w-8 opacity-100"
            }`}
          >
            {items}
          </ul>
        </div>
      </aside>

      {/* Mobile (< md): bottom-edge horizontal bar. */}
      <aside
        aria-label="Compartilhar esta página"
        className="fixed inset-x-0 bottom-0 z-40 flex md:hidden"
      >
        <div className="flex w-full items-center justify-center border-t border-base-300 bg-base-100/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_-12px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center">
            <ToggleButton
              collapsed={collapsed}
              onToggle={() => setCollapsed((value) => !value)}
            />
            <ul
              className={`flex flex-row items-center overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none ${
                collapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100"
              }`}
            >
              {items}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
