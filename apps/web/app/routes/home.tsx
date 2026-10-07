import { data, Form, Link } from "react-router";

import { Alert } from "~/components/Alert";
import { EmptyState } from "~/components/EmptyState";
import { FormField } from "~/components/FormField";
import { HeroCarousel, type HeroSlide } from "~/components/HeroCarousel";
import {
  ArrowUpRightIcon,
  FileTextIcon,
  InstagramIcon,
  LayersIcon,
  MapPinIcon,
  SparklesIcon,
} from "~/components/Icons";
import { ImageWithFallback } from "~/components/ImageWithFallback";
import { PartnerCarousel } from "~/components/PartnerCarousel";
import { PostCard } from "~/components/PostCard";
import { createApi, withFallback } from "~/lib/api.server";
import { getString } from "~/lib/format";
import { CONTACT_ADDRESS, mapEmbedUrl, resolveSocial, toInstagramEmbedUrl } from "~/lib/site";
import {
  ApiError,
  emptyPage,
  type ContactLeadDto,
  type Page,
  type PostSummaryDto,
} from "~/lib/types";

import type { Route } from "./+types/home";
import { usePublicLayoutData } from "./public-layout";

/* ------------------------------------------------------------------ */
/* Loader — one latest post per category                               */
/* ------------------------------------------------------------------ */

const FEATURED_CATEGORIES = [
  "ultimas-noticias",
  "ficas-em-acao",
  "dicas-ficas",
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const api = createApi(request);

  const [categoryPages, latestPage] = await Promise.all([
    Promise.all(
      FEATURED_CATEGORIES.map((slug) =>
        withFallback(
          () =>
            api.get<Page<PostSummaryDto>>(
              `/api/public/posts?page=0&size=1&category=${encodeURIComponent(slug)}`,
            ),
          emptyPage<PostSummaryDto>(1),
          `home-post-${slug}`,
        ),
      ),
    ),
    withFallback(
      () => api.get<Page<PostSummaryDto>>("/api/public/posts?page=0&size=3"),
      emptyPage<PostSummaryDto>(3),
      "home-posts",
    ),
  ]);

  // Prefer one latest post per category, then fill any gaps with the overall
  // latest so the "Notícias" grid always shows up to three cards.
  const seen = new Set<number>();
  const posts: PostSummaryDto[] = [];
  const pool = [
    ...categoryPages.map((page) => page.content[0]),
    ...latestPage.content,
  ];
  for (const post of pool) {
    if (!post || seen.has(post.id)) continue;
    seen.add(post.id);
    posts.push(post);
    if (posts.length === 3) break;
  }

  return { posts };
}

/* ------------------------------------------------------------------ */
/* Newsletter action                                                   */
/* ------------------------------------------------------------------ */

function newsletterValues(form: FormData) {
  return {
    name: getString(form, "name"),
    email: getString(form, "email"),
    phone: getString(form, "phone"),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const values = newsletterValues(form);
  const consent =
    form.get("consent") === "on" || form.get("consent") === "true";

  const fieldErrors: Record<string, string> = {};
  if (!values.name) fieldErrors.name = "Informe seu nome.";
  if (!values.email) fieldErrors.email = "Informe seu e-mail.";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
    fieldErrors.email = "Informe um e-mail válido.";
  }
  if (!consent) {
    fieldErrors.consent = "É necessário autorizar o recebimento dos informativos.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return data(
      {
        ok: false as const,
        fieldErrors,
        values,
        message: "Revise os campos destacados.",
      },
      { status: 400 },
    );
  }

  const api = createApi(request);
  try {
    await api.post<ContactLeadDto>("/api/public/contact", {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      message:
        "Inscrição na newsletter: quero receber os informativos e oportunidades do FICAS.",
      consent,
      source: "newsletter",
    });

    return {
      ok: true as const,
      message: "Inscrição confirmada! Em breve você receberá nossos informativos.",
      fieldErrors: {} as Record<string, string>,
      values: { name: "", email: "", phone: "" },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return data(
        {
          ok: false as const,
          message:
            error.problem.detail ||
            "Não foi possível concluir a inscrição. Verifique os dados e tente novamente.",
          fieldErrors: error.fieldErrors,
          values,
        },
        { status: error.status },
      );
    }

    return data(
      {
        ok: false as const,
        message: "Serviço indisponível no momento. Tente novamente mais tarde.",
        fieldErrors: {} as Record<string, string>,
        values,
      },
      { status: 503 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const heroSlides: HeroSlide[] = [
  {
    id: "hero-mandala",
    label: "Mandala",
    variant: "image",
    imageUrl: "/home/hero-mandala.jpg",
    imageAlt: "Mandala multicolorida sobre um fundo verde",
    title: (
      <>
        Compartilhando conhecimentos,{" "}
        <span className="text-primary">transformando</span>{" "}
        <span className="text-secondary">pessoas e organizações.</span>
      </>
    ),
    primaryCta: { label: "COLABORE COM O FICAS", to: "/colabore" },
  },
  {
    id: "hero-pipas",
    label: "Pipas Migrantes",
    variant: "image",
    imageUrl: "/home/hero-pipas.jpg",
    imageAlt: "Pipas migrantes coloridas sobre o céu",
    title: "Pipas Migrantes",
  },
  {
    id: "hero-conheca",
    label: "Conheça",
    variant: "image",
    imageUrl: "/home/hero-conheca.jpg",
    imageAlt: "Encontro de formação do FICAS com participantes",
    title: "Conheça os nossos programas, assessorias e ações",
    primaryCta: { label: "DETALHES AQUI", to: "/programas" },
  },
];

/** Institutional paragraphs, reproduced from the old homepage. */
const QUEM_SOMOS = [
  <>
    O FICAS é uma organização sem fins lucrativos, que acredita que as
    organizações da sociedade civil, as associações comunitárias e os coletivos
    têm um papel fundamental e estratégico nas transformações sociais. Desde
    1997, investe continuamente em seu fortalecimento por meio de{" "}
    <strong className="font-semibold text-base-content">programas</strong>,{" "}
    <strong className="font-semibold text-base-content">assessorias</strong> e{" "}
    <strong className="font-semibold text-base-content">ações</strong> gratuitas
    de formação e articulação com o apoio de parceiros investidores e técnicos.
  </>,
  <>
    Com sede em São Paulo, mas atuação em todo o país, o FICAS desenvolve um
    trabalho voltado ao{" "}
    <strong className="font-semibold text-base-content">
      fortalecimento institucional
    </strong>
    , <strong className="font-semibold text-base-content">educação</strong>,{" "}
    <strong className="font-semibold text-base-content">avaliação</strong> e,
    mais especificamente nos últimos anos, no campo da{" "}
    <strong className="font-semibold text-base-content">migração</strong>. Suas
    metodologias são inovadoras, replicáveis e construídas de forma
    participativa.
  </>,
  <>Venha ficar junto!</>,
];

const QUEM_SOMOS_PHOTOS = [
  {
    src: "/home/quem-somos-1.jpg",
    alt: "Equipe do FICAS reunida em um encontro de formação",
    className:
      "col-span-2 aspect-[16/10] rounded-2xl object-cover shadow-xl shadow-base-content/10",
  },
  {
    src: "/home/quem-somos-2.jpg",
    alt: "Participantes de um programa do FICAS em atividade",
    className:
      "-mt-6 aspect-square rounded-2xl object-cover shadow-lg shadow-base-content/10 ring-4 ring-base-100",
  },
  {
    src: "/home/quem-somos-3.jpg",
    alt: "Ação do FICAS junto a uma comunidade",
    className:
      "-mt-6 aspect-[4/5] rounded-2xl object-cover shadow-lg shadow-base-content/10 ring-4 ring-base-100",
  },
];

/**
 * The three "frentes" of the old homepage. Their original colours were red,
 * blue and green — mapped here to the daisyUI theme tokens error, primary and
 * secondary. Each keeps the brand accent bar at the bottom.
 */
const FRENTES = [
  {
    key: "programas",
    label: "PROGRAMAS",
    href: "/programas",
    icon: LayersIcon,
    surface: "bg-error text-error-content",
    chip: "bg-error-content/15 text-error-content",
    description:
      "Direcionados a organizações da sociedade civil, associações e coletivos, líderes comunitários, entre outros atores do campo social, têm como objetivo o fortalecimento das instituições na área de gestão e na sua atividade-fim. Com duração de seis a 15 meses, as atividades são presenciais ou virtuais, com acompanhamento à distância.",
  },
  {
    key: "assessorias",
    label: "ASSESSORIAS",
    href: "/assessorias",
    icon: FileTextIcon,
    surface: "bg-primary text-primary-content",
    chip: "bg-primary-content/15 text-primary-content",
    description:
      "Apoio a institutos, fundações, empresas e demais investidores no desenvolvimento e avaliação de seus programas sociais, fortalecendo a ponte com as organizações da sociedade civil. Dentre as possíveis atividades realizadas estão: processos seletivos de projetos; acompanhamento técnico e financeiro de programas; avaliação de processos e de resultados; entre outros.",
  },
  {
    key: "acoes",
    label: "AÇÕES",
    href: "/acoes",
    icon: SparklesIcon,
    surface: "bg-secondary text-secondary-content",
    chip: "bg-secondary-content/15 text-secondary-content",
    description:
      "O FICAS promove oficinas de temas de sua expertise, facilita encontros e planejamentos, e realiza eventos que têm como objetivo estimular a troca entre os diversos atores sociais e a construção coletiva do conhecimento, disseminando conteúdos, metodologias, aprendizagens da prática e fortalecendo o trabalho em rede.",
  },
];

const RESULTADOS = [
  {
    icon: "/home/resultado-ong.png",
    title: "+1.500 organizações",
    description: "e mais coletivos e líderes comunitários fortalecidos.",
  },
  {
    icon: "/home/resultado-educadores.png",
    title: "+25 mil gestores/as e educadores/as",
    description: "participaram das formações direta ou indiretamente.",
  },
  {
    icon: "/home/resultado-globo.png",
    title: "21 estados e DF",
    description: "além de um programa em Moçambique.",
  },
];

/**
 * Placeholder partner logos (Divi demo assets) shipped with the old site.
 * Real partner logos must be supplied by the client before launch.
 */
const PARCEIROS = [
  { src: "/home/parceiro-1.jpg", alt: "Logotipo de parceiro (placeholder)" },
  { src: "/home/parceiro-2.jpg", alt: "Logotipo de parceiro (placeholder)" },
  { src: "/home/parceiro-3.jpg", alt: "Logotipo de parceiro (placeholder)" },
  { src: "/home/parceiro-4.jpg", alt: "Logotipo de parceiro (placeholder)" },
  { src: "/home/parceiro-5.jpg", alt: "Logotipo de parceiro (placeholder)" },
  { src: "/home/parceiro-6.jpg", alt: "Logotipo de parceiro (placeholder)" },
];

export const meta: Route.MetaFunction = () => [
  {
    title:
      "FICAS — Compartilhando conhecimentos, transformando pessoas e organizações",
  },
  {
    name: "description",
    content:
      "Organização sem fins lucrativos que fortalece a sociedade civil com programas, assessorias e ações gratuitas de formação e articulação desde 1997.",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const formValues = actionData?.values;
  const news = loaderData.posts;

  // Settings come from the public shell loader; social values fall back to the
  // canonical FICAS profiles when the admin leaves them blank.
  const settings = usePublicLayoutData()?.settings ?? null;
  const social = resolveSocial(settings);
  const instagramUrl = social.instagram;
  const instagramEmbedUrl = toInstagramEmbedUrl(instagramUrl);
  const mapsUrl = mapEmbedUrl();

  return (
    <div className="flex flex-col gap-20 lg:gap-28">
      {/* 1 — Hero carousel */}
      <HeroCarousel slides={heroSlides} intervalMs={5000} />

      {/* 2 — Quem somos */}
      <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-5">
          <h2 className="text-3xl font-black sm:text-4xl">Quem somos</h2>
          <div className="flex flex-col gap-4 text-base leading-relaxed text-base-content/75">
            {QUEM_SOMOS.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <Link
            to="/historia"
            className="link link-primary inline-flex w-fit items-center gap-1 font-semibold"
          >
            Conheça a nossa história
            <ArrowUpRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {QUEM_SOMOS_PHOTOS.map((photo) => (
            <figure key={photo.src} className={photo.className}>
              <ImageWithFallback
                src={photo.src}
                alt={photo.alt}
                className="h-full w-full object-cover"
              />
            </figure>
          ))}
        </div>
      </section>

      {/* 3 — Três frentes */}
      <section className="grid gap-6 md:grid-cols-3">
        {FRENTES.map((frente) => {
          const Icon = frente.icon;
          return (
            <Link
              key={frente.key}
              to={frente.href}
              className={`card group relative overflow-hidden rounded-2xl shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${frente.surface}`}
            >
              <div className="card-body gap-4 p-7">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-box ${frente.chip}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-2xl font-black uppercase tracking-wide">
                  {frente.label}
                </h3>
                <p className="text-sm leading-relaxed">{frente.description}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-bold underline underline-offset-4">
                  Saiba mais
                  <ArrowUpRightIcon className="h-4 w-4" />
                </span>
              </div>
              <span className="h-1.5 w-full bg-accent" aria-hidden="true" />
            </Link>
          );
        })}
      </section>

      {/* 4 — Resultados */}
      <section className="surface-mesh rounded-3xl border border-base-300/70 px-6 py-14 sm:px-10">
        <h2 className="text-center text-3xl font-black sm:text-4xl">
          Resultados
        </h2>
        <ul className="mt-12 grid gap-10 sm:grid-cols-3">
          {RESULTADOS.map((resultado) => (
            <li
              key={resultado.title}
              className="flex flex-col items-center gap-4 text-center"
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-base-100 shadow-sm">
                <img
                  src={resultado.icon}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-14 w-14 object-contain"
                />
              </span>
              <p className="font-display text-2xl font-black text-base-content">
                {resultado.title}
              </p>
              <p className="max-w-xs text-sm leading-relaxed text-base-content/70">
                {resultado.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 5 — Notícias */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">Notícias</h2>
          <p className="max-w-2xl text-base-content/75">
            Acompanhe as publicações, projetos e ações mais recentes do FICAS.
          </p>
        </div>
        {news.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <div className="flex justify-center">
              <Link to="/noticias" className="btn btn-outline btn-sm">
                Ver todas as notícias
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <EmptyState
            title="Nenhuma notícia publicada ainda"
            description="Assim que houver publicações, elas aparecerão aqui."
          />
        )}
      </section>

      {/* 6 — Parceiros */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">Parceiros</h2>
          <p className="max-w-2xl text-base-content/75">
            Nossas ações acontecem com o apoio de parceiros investidores e
            técnicos.
          </p>
        </div>
        <PartnerCarousel logos={PARCEIROS} />
      </section>

      {/* 7 — Instagram */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-box bg-primary/10 text-primary">
              <InstagramIcon className="h-6 w-6" />
            </span>
            <h2 className="text-3xl font-black sm:text-4xl">Instagram</h2>
          </div>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
          >
            Siga-nos no Instagram
            <ArrowUpRightIcon className="h-4 w-4" />
          </a>
        </div>

        <iframe
          src={instagramEmbedUrl}
          title="Instagram do FICAS"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allow="encrypted-media"
          className="block h-[70vh] max-h-[760px] min-h-[420px] w-full rounded-box border border-base-300 bg-base-100"
        />
      </section>

      {/* 8 — Onde estamos */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-box bg-secondary/10 text-secondary">
            <MapPinIcon className="h-6 w-6" />
          </span>
          <h2 className="text-3xl font-black sm:text-4xl">Onde estamos</h2>
          <p className="max-w-2xl text-base-content/75">
            {CONTACT_ADDRESS.street} — {CONTACT_ADDRESS.district},{" "}
            {CONTACT_ADDRESS.city}
          </p>
        </div>

        <div className="overflow-hidden rounded-box border border-base-300 bg-base-200 shadow-sm">
          <iframe
            src={mapsUrl}
            title="Mapa — sede da FICAS em Vila Mariana, São Paulo"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-[22rem] w-full sm:h-[26rem]"
          />
        </div>
      </section>

      {/* 9 — Newsletter */}
      <section
        id="newsletter"
        className="surface-mesh grid gap-10 rounded-3xl border border-base-300/70 px-6 py-12 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:py-14"
      >
        <div className="flex flex-col gap-5">
          <h2 className="text-3xl font-black sm:text-4xl">
            Receba nossos{" "}
            <span className="text-secondary">informativos</span>
          </h2>
          <p className="text-base-content/75">
            Uma seleção de notícias e oportunidades diretamente na sua caixa
            postal!
          </p>
          <p className="text-sm text-base-content/60">
            Prefere falar diretamente com a equipe?{" "}
            <Link to="/contato" className="link link-primary font-semibold">
              Use o formulário de contato
            </Link>
            .
          </p>
        </div>

        <Form
          key={actionData?.ok ? "newsletter-sent" : "newsletter-form"}
          method="post"
          className="card border border-base-300 bg-base-100 shadow-sm"
        >
          <div className="card-body gap-5">
            <div>
              <h3 className="font-display text-xl font-bold">
                Assine os informativos
              </h3>
              <p className="text-sm text-base-content/60">
                Informe seu nome e e-mail. O WhatsApp é opcional.
              </p>
            </div>

            {actionData ? (
              <Alert status={actionData.ok ? "success" : "error"}>
                {actionData.message}
              </Alert>
            ) : null}

            <FormField
              label="Nome"
              name="name"
              required
              autoComplete="name"
              defaultValue={formValues?.name}
              error={actionData?.fieldErrors?.name}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="E-mail"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={formValues?.email}
                error={actionData?.fieldErrors?.email}
              />
              <FormField
                label="WhatsApp (opcional)"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={formValues?.phone}
              />
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="consent"
                  className="checkbox checkbox-primary mt-0.5"
                  defaultChecked={false}
                />
                <span className="text-base-content/75">
                  Autorizo o recebimento dos informativos e o uso dos meus dados
                  para esse fim.
                </span>
              </label>
              {actionData?.fieldErrors?.consent ? (
                <p className="mt-1 text-xs text-error" role="alert">
                  {actionData.fieldErrors.consent}
                </p>
              ) : null}
            </div>

            <div className="card-actions justify-end">
              <button type="submit" className="btn btn-primary">
                Quero receber
              </button>
            </div>
          </div>
        </Form>
      </section>
    </div>
  );
}
