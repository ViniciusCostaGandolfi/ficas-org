import type { ReactNode } from "react";
import { Link } from "react-router";

import {
  ArrowUpRightIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  TwitterIcon,
  WhatsAppIcon,
  YoutubeIcon,
} from "~/components/Icons";
import { PageHeader } from "~/components/PageHeader";
import {
  CONTACT_ADDRESS,
  mapEmbedUrl,
  resolveSocial,
  telHref,
  whatsappHref,
  WHATSAPP_MESSAGE,
} from "~/lib/site";

import type { Route } from "./+types/contato";
import { usePublicLayoutData } from "./public-layout";

export const meta: Route.MetaFunction = () => [
  { title: "Contato — FICAS" },
  {
    name: "description",
    content:
      "Fale com o FICAS: telefone, WhatsApp, e-mail, endereço e redes sociais.",
  },
];

/** Readable handle/slug extracted from a social profile URL. */
function socialHandle(url: string): string {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : parsed.hostname;
  } catch {
    return url;
  }
}

/** Display label for a social link (with `@` for handle-based networks). */
function socialLabel(key: string, url: string): string {
  const handle = socialHandle(url);
  if (handle.startsWith("@")) return handle;
  return key === "instagram" || key === "twitter" ? `@${handle}` : handle;
}

/** Shared contact-detail card. */
function ContactCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MailIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-box bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <div className="text-sm leading-relaxed text-base-content/75">
          {children}
        </div>
      </div>
    </article>
  );
}

export default function Contato() {
  const settings = usePublicLayoutData()?.settings ?? null;
  const social = resolveSocial(settings);
  const contact = settings?.contact;

  const phone = contact?.phone?.trim() || CONTACT_ADDRESS.phone;
  const email = contact?.email?.trim() || "";
  const address = contact?.address?.trim() || "";

  const socials = (
    [
      {
        key: "instagram",
        label: "Instagram",
        href: social.instagram,
        Icon: InstagramIcon,
      },
      {
        key: "facebook",
        label: "Facebook",
        href: social.facebook,
        Icon: FacebookIcon,
      },
      {
        key: "twitter",
        label: "Twitter/X",
        href: social.twitter,
        Icon: TwitterIcon,
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        href: social.linkedin,
        Icon: LinkedinIcon,
      },
      {
        key: "youtube",
        label: "YouTube",
        href: social.youtube,
        Icon: YoutubeIcon,
      },
    ] as const
  ).filter((entry) => entry.href.trim() !== "");

  return (
    <div className="flex flex-col gap-10">
      <div className="breadcrumbs text-sm text-base-content/60">
        <ul>
          <li>
            <Link to="/" className="link link-hover">
              Início
            </Link>
          </li>
          <li>Contato</li>
        </ul>
      </div>

      <PageHeader
        eyebrow="Fale com a gente"
        title="Contato"
        lead="Dúvidas, sugestões ou vontade de colaborar? Use um dos canais abaixo para falar diretamente com a equipe do FICAS."
      />

      {/* Canais de contato */}
      <section className="flex flex-col gap-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          Canais de contato
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ContactCard icon={PhoneIcon} title="Telefone">
            <a
              href={telHref(phone)}
              className="link link-primary font-semibold"
            >
              {phone}
            </a>
          </ContactCard>

          <ContactCard icon={WhatsAppIcon} title="WhatsApp">
            <a
              href={whatsappHref(CONTACT_ADDRESS.whatsapp, WHATSAPP_MESSAGE)}
              target="_blank"
              rel="noopener"
              className="link link-primary font-semibold"
            >
              {CONTACT_ADDRESS.whatsapp}
            </a>
          </ContactCard>

          <ContactCard icon={MapPinIcon} title="Endereço">
            {address ? (
              <span>{address}</span>
            ) : (
              <>
                {CONTACT_ADDRESS.street}
                <br />
                {CONTACT_ADDRESS.district} — {CONTACT_ADDRESS.city}
                <br />
                {CONTACT_ADDRESS.postalCode.replace(/,+$/, "")}
              </>
            )}
            <a
              href={mapEmbedUrl()}
              target="_blank"
              rel="noopener"
              className="link link-primary mt-3 inline-flex items-center gap-1 font-semibold"
            >
              Ver no mapa
              <ArrowUpRightIcon className="h-4 w-4" />
            </a>
          </ContactCard>

          {email ? (
            <ContactCard icon={MailIcon} title="E-mail">
              <a
                href={`mailto:${email}`}
                className="link link-primary font-semibold break-all"
              >
                {email}
              </a>
            </ContactCard>
          ) : null}
        </div>
      </section>

      {/* Redes sociais */}
      <section className="flex flex-col gap-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          Redes sociais
        </h2>
        {socials.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {socials.map(({ key, label, href, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-box bg-secondary/10 text-secondary">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{label}</span>
                  <span className="truncate text-sm text-base-content/60">
                    {socialLabel(key, href)}
                  </span>
                </span>
                <ArrowUpRightIcon className="ml-auto h-4 w-4 shrink-0 text-base-content/40" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-base-content/70">
            Nenhuma rede social cadastrada ainda.
          </p>
        )}
      </section>

      {/* Onde estamos */}
      <section className="flex flex-col gap-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          Onde estamos
        </h2>
        <iframe
          src={mapEmbedUrl()}
          title="Mapa — sede da FICAS em Vila Mariana, São Paulo"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[22rem] min-h-[360px] w-full rounded-box border border-base-300 bg-base-200 sm:h-[26rem]"
        />
      </section>
    </div>
  );
}
